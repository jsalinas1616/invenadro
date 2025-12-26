const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const XLSX = require('xlsx');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'mx-central-1' });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'mx-central-1' });

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'mx-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

/**
 * Lambda Puente: IPP → Factor de Redondeo
 * 
 * Se activa cuando Databricks guarda metadata.json en S3 (ipp-raw)
 * Lee los archivos particionados por cliente y los envía uno por uno
 * al Factor de Redondeo existente.
 */
exports.handler = async (event) => {
  try {
    console.log('=' .repeat(80));
    console.log('IPP-TO-FACTOR BRIDGE - Iniciando...');
    console.log('=' .repeat(80));
    
    // 1. DETECTAR QUÉ ARCHIVO SE CREÓ EN S3
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Archivo detectado: s3://${bucket}/${key}`);
    
    // Solo procesar archivos .json en la carpeta metadata/
    if (!key.startsWith('metadata/') || !key.endsWith('.json')) {
      console.log('No es un archivo metadata, ignorando...');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Not a metadata file, skipping' })
      };
    }
    
    // 2. LEER METADATA.JSON
    console.log('\nLeyendo metadata.json...');
    const metadataResponse = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    
    const metadataContent = await streamToString(metadataResponse.Body);
    const metadata = JSON.parse(metadataContent);
    
    console.log(`Metadata leída:`);
    console.log(`   - Job ID: ${metadata.job_id}`);
    console.log(`   - Total clientes: ${metadata.total_clientes}`);
    console.log(`   - Total registros: ${metadata.total_registros}`);
    
    const jobId = metadata.job_id;
    
    // 3. ACTUALIZAR ESTADO EN DYNAMODB IPP
    await actualizarEstadoIPP(jobId, 'factor_initiated', metadata.total_clientes);
    
    // 4. PROCESAR CADA CLIENTE (UNO POR UNO)
    const resultadosProcesamiento = [];
    
    for (let i = 0; i < metadata.clientes.length; i++) {
      const clienteInfo = metadata.clientes[i];
      console.log('\n' + '─'.repeat(80));
      console.log(`[${i + 1}/${metadata.total_clientes}] Procesando cliente: ${clienteInfo.cliente}`);
      console.log('─'.repeat(80));
      
      try {
        // 4.1. Leer archivo del cliente desde S3
        const clienteKey = `clientes/cliente_${clienteInfo.cliente}.json`;
        console.log(`   Leyendo: s3://${bucket}/${clienteKey}`);
        
        const clienteResponse = await s3Client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: clienteKey
        }));
        
        const clienteContent = await streamToString(clienteResponse.Body);
        const datosCliente = JSON.parse(clienteContent);
        
        console.log(`   Leído: ${datosCliente.datos.length} registros`);
        
        // 4.2. TRANSFORMAR JSON → EXCEL (formato que espera Factor de Redondeo)
        console.log(`   Transformando JSON a Excel...`);
        const excelBuffer = transformarIPPaExcel(datosCliente);
        console.log(`   Excel generado: ${(excelBuffer.length / 1024).toFixed(2)} KB`);
        
        // 4.3. SUBIR EXCEL A S3 (bucket de uploads)
        const uploadsBucket = process.env.UPLOADS_BUCKET;
        const uploadKey = `ipp-to-factor/${metadata.job_id}/${clienteInfo.cliente}/input.xlsx`;
        
        await s3Client.send(new PutObjectCommand({
          Bucket: uploadsBucket,
          Key: uploadKey,
          Body: excelBuffer,
          ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }));
        
        console.log(`   Excel subido: s3://${uploadsBucket}/${uploadKey}`);
        
        // 4.4. INVOCAR INITIATOR DEL FACTOR DE REDONDEO (Lambda existente)
        const initiatorPayload = {
          s3Bucket: uploadsBucket,
          s3Key: uploadKey,
          customConfig: {
            source: 'IPP',
            ipp_job_id: metadata.job_id,
            cliente: clienteInfo.cliente,
            // Configuración por defecto del Factor de Redondeo
            factorRedondeo: 0.47,
            joroba: 3.5,
            diasInversionDeseados: 27
          },
          originalname: `ipp_${clienteInfo.cliente}.xlsx`
        };
        
        console.log(`   Invocando initiator para cliente ${clienteInfo.cliente}...`);
        
        const invokeResponse = await lambdaClient.send(new InvokeCommand({
          FunctionName: process.env.INITIATOR_FUNCTION_NAME,
          InvocationType: 'Event', // Asíncrono (no espera respuesta)
          Payload: JSON.stringify(initiatorPayload)
        }));
        
        console.log(`   Initiator invocado (StatusCode: ${invokeResponse.StatusCode})`);
        
        resultadosProcesamiento.push({
          cliente: clienteInfo.cliente,
          status: 'success',
          registros: datosCliente.datos.length,
          s3_excel_path: `s3://${uploadsBucket}/${uploadKey}`
        });
        
        // Pausa de 500ms entre clientes (para no saturar)
        if (i < metadata.total_clientes - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (clienteError) {
        console.error(`   ERROR procesando cliente ${clienteInfo.cliente}:`, clienteError);
        
        resultadosProcesamiento.push({
          cliente: clienteInfo.cliente,
          status: 'failed',
          error: clienteError.message
        });
        
        // Continuar con el siguiente cliente (no fallar todo)
      }
    }
    
    // 5. RESUMEN FINAL
    const exitosos = resultadosProcesamiento.filter(r => r.status === 'success').length;
    const fallidos = resultadosProcesamiento.filter(r => r.status === 'failed').length;
    
    console.log('\n' + '='.repeat(80));
    console.log('PROCESO IPP-TO-FACTOR COMPLETADO');
    console.log('='.repeat(80));
    console.log(`Clientes exitosos: ${exitosos}/${metadata.total_clientes}`);
    if (fallidos > 0) {
      console.log(`Clientes fallidos: ${fallidos}`);
    }
    console.log('='.repeat(80));
    
    // 6. ACTUALIZAR ESTADO FINAL EN DYNAMODB IPP
    await actualizarEstadoIPP(
      jobId, 
      fallidos > 0 ? 'factor_partial' : 'factor_completed',
      metadata.total_clientes,
      { exitosos, fallidos, resultados: resultadosProcesamiento }
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'IPP to Factor bridge completed',
        job_id: jobId,
        total_clientes: metadata.total_clientes,
        exitosos,
        fallidos,
        resultados: resultadosProcesamiento
      })
    };
    
  } catch (error) {
    console.error('ERROR en ipp-to-factor-bridge:', error);
    console.error('Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error en IPP-to-Factor bridge',
        message: error.message
      })
    };
  }
};

// ==========================================================
// HELPER: Convertir Stream a String
// ==========================================================
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// ==========================================================
// TRANSFORMAR JSON IPP → EXCEL PARA FACTOR DE REDONDEO
// ==========================================================
function transformarIPPaExcel(datosCliente) {
  console.log('      Iniciando transformación...');
  
  // Extraer datos del cliente
  const datos = datosCliente.datos;
  
  if (!datos || datos.length === 0) {
    throw new Error('No hay datos para transformar');
  }
  
  console.log(`      ${datos.length} registros a transformar`);

  datos.forEach(row => {
    console.log('julian test', row);
  });
  
  // Crear estructura que espera Factor de Redondeo
  // Mapeo de columnas IPP → Factor de Redondeo
  const datosExcel = datos.map(row => {
    return {
      Cliente: datosCliente.cliente,
      Material: row.MATERIAL_mg || row.Material || '',
      Descripción: row.DESCRIPCION || '',
      'EAN/UPC': row['EAN/UPC'] || 'NA',
      'EAN/UPC/SKU': row['EAN/UPC/SKU'] || '',
      'Ctd.UMB': row.Ctd_UMB || row.PRONOSTICO || 0,
      'Factor A': row.Factor_A || 0,
      'Factor B': row.Factor_B || 0,
      'Factor C': row.Factor_C || 0,
      'Factor D': row.Factor_D || 0,
      'Factor F': row.Factor_F || 0,
      'Factor 4': row.Factor_4 || 0,
      'Factor 9': row.Factor_9 || 0,
      'Ponderación Tradicional': row.PONDERACION_TRADICIONAL || 0,
      'Porcentaje Tradicional': row.PORCENTAJE_TRADICIONAL || 0,
      'Precio Farmacia': row.Precio_Farmacia || 0,
      Inversión: row.Importe || 0,
      'Monto Venta Mostrador': row.Monto_Venta_Mostrador || 0,
      'Monto Venta Mostrador Cliente': row.Monto_Venta_Mostrador_Cliente || 0,
      'Venta Neta Anual': row.Venta_neta_anual || 0,
      'Venta Neta Trimestral': row.Venta_neta_trimestral || 0,
      'Pronóstico Total CP': row.Pronostico_Total_CP || 0,
      'Pronóstico Total CP Cliente': row.Pronostico_Total_CP_Cliente || 0,
      'Ratio Factor': row.Ratio_Factor || 0,
      'Venta Diaria por Producto': row.venta_diaria_por_producto || 0,
      'Pz Venta Mostrador Producto Diario': row.pz_de_venta_mostrador_producto_diario || 0,
      'ID Proveedor': row.ID_PROVEEDOR || '',
      'Nombre Proveedor': row.NOMBRE_PROVEEDOR || '',
      'Categoría InveNadro': row.CATEGORIA_INVENADRO || '',
      'Categoría Materiales': row.CATEGORIA_MATERIALES || ''
    };
  });
  
  // Crear workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);
  
  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 10 }, // Cliente
    { wch: 15 }, // Material
    { wch: 30 }, // Descripción
    { wch: 15 }, // EAN/UPC
    { wch: 18 }, // EAN/UPC/SKU
    { wch: 12 }, // Ctd.UMB
    { wch: 12 }, // Factor A
    { wch: 12 }, // Factor B
    { wch: 12 }, // Factor C
    { wch: 12 }, // Factor D
    { wch: 12 }, // Factor F
    { wch: 12 }, // Factor 4
    { wch: 12 }, // Factor 9
    { wch: 20 }, // Ponderación Tradicional
    { wch: 20 }, // Porcentaje Tradicional
    { wch: 15 }, // Precio Farmacia
    { wch: 15 }, // Inversión
    { wch: 20 }, // Monto Venta Mostrador
    { wch: 25 }, // Monto Venta Mostrador Cliente
    { wch: 18 }, // Venta Neta Anual
    { wch: 20 }, // Venta Neta Trimestral
    { wch: 20 }, // Pronóstico Total CP
    { wch: 25 }, // Pronóstico Total CP Cliente
    { wch: 15 }, // Ratio Factor
    { wch: 22 }, // Venta Diaria por Producto
    { wch: 28 }, // Pz Venta Mostrador Producto Diario
    { wch: 15 }, // ID Proveedor
    { wch: 25 }, // Nombre Proveedor
    { wch: 20 }, // Categoría InveNadro
    { wch: 25 }  // Categoría Materiales
  ];
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  
  // Generar buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  console.log(`      Transformación completa: ${datosExcel.length} filas`);
  
  return excelBuffer;
}

// ==========================================================
// ACTUALIZAR ESTADO EN DYNAMODB (tabla ipp-jobs)
// ==========================================================
async function actualizarEstadoIPP(jobId, status, totalClientes, detalles = null) {
  const IPP_JOBS_TABLE = process.env.IPP_JOBS_TABLE || 'invenadro-backend-jul-dev-ipp-jobs';
  
  try {
    const updateExpression = detalles 
      ? 'SET #s = :status, updated_at = :time, factor_total_clientes = :total, factor_detalles = :detalles'
      : 'SET #s = :status, updated_at = :time, factor_total_clientes = :total';
    
    const expressionValues = {
      ':status': status,
      ':time': new Date().toISOString(),
      ':total': totalClientes
    };
    
    if (detalles) {
      expressionValues[':detalles'] = detalles;
    }
    
    await docClient.send(new UpdateCommand({
      TableName: IPP_JOBS_TABLE,
      Key: { job_id: jobId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#s': 'status'
      },
      ExpressionAttributeValues: expressionValues
    }));
    
    console.log(`   DynamoDB actualizado: ${jobId} -> ${status}`);
  } catch (error) {
    console.error(`   WARNING: Error actualizando DynamoDB:`, error.message);
    // No fallar el proceso si DynamoDB falla
  }
}

