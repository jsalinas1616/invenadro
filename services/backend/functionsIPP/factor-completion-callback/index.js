const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'mx-central-1' });

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'mx-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

/**
 * Lambda Callback: Factor de Redondeo -> IPP
 * 
 * Se ejecuta cuando el Factor de Redondeo completa el procesamiento
 * de un cliente que vino desde IPP. Actualiza el estado en la tabla
 * IPP para que el frontend IPP sepa que terminó.
 * 
 * Trigger: S3 Event en bucket "results" cuando se crea resultado.json
 */
exports.handler = async (event) => {
  try {
    console.log('='.repeat(80));
    console.log('FACTOR-COMPLETION-CALLBACK - Iniciando...');
    console.log('='.repeat(80));
    
    // 1. DETECTAR QUÉ ARCHIVO SE CREÓ EN S3
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Archivo detectado: s3://${bucket}/${key}`);
    
    // Solo procesar resultado.json (no otros archivos)
    if (!key.endsWith('resultado.json') || !key.includes('resultados/')) {
      console.log('No es resultado.json, ignorando...');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Not resultado.json, skipping' })
      };
    }
    
    // Extraer processId del path (resultados/{processId}/resultado.json)
    const processIdMatch = key.match(/resultados\/([^\/]+)\/resultado\.json/);
    if (!processIdMatch) {
      console.error('ERROR: No se pudo extraer processId del path:', key);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Invalid path format' })
      };
    }
    const processId = processIdMatch[1];
    console.log(`Process ID: ${processId}`);
    
    // 2. LEER RESULTADO DEL FACTOR DE REDONDEO
    console.log('\nLeyendo resultado del Factor de Redondeo...');
    const resultadoResponse = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    
    const resultadoContent = await streamToString(resultadoResponse.Body);
    const resultado = JSON.parse(resultadoContent);
    
    console.log(`Resultado leído - Status: ${resultado.status}`);
    
    // 3. VERIFICAR SI VIENE DE IPP
    const customConfig = resultado.customConfig || {};
    
    if (!customConfig.source || customConfig.source !== 'IPP') {
      console.log('Proceso normal del Factor (sin IPP), ignorando callback...');
      console.log('   customConfig.source:', customConfig.source || 'undefined');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Not from IPP, no callback needed',
          processId: processId
        })
      };
    }
    
    // 4. VIENE DE IPP - EXTRAER INFORMACIÓN
    const ippJobId = customConfig.ipp_job_id;
    const cliente = customConfig.cliente;
    
    if (!ippJobId || !cliente) {
      console.error('WARNING: Viene de IPP pero faltan datos:', { ippJobId, cliente });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Missing ipp_job_id or cliente' })
      };
    }
    
    console.log('Viene de IPP:');
    console.log(`   - IPP Job ID: ${ippJobId}`);
    console.log(`   - Cliente: ${cliente}`);
    console.log(`   - Process ID: ${processId}`);
    
    // 5. ACTUALIZAR DYNAMODB IPP CON EL RESULTADO
    await actualizarIPPConResultadoFactor(
      ippJobId,
      cliente,
      processId,
      resultado.status,
      `s3://${bucket}/${key}`
    );
    
    // 6. VERIFICAR SI TODOS LOS CLIENTES TERMINARON
    const todosCompletos = await verificarTodosClientesCompletos(ippJobId);
    
    if (todosCompletos) {
      console.log('\nTODOS LOS CLIENTES DEL IPP COMPLETADOS');
      await actualizarEstadoFinalIPP(ippJobId);
    } else {
      console.log('\nAún hay clientes procesándose...');
    }
    
    console.log('='.repeat(80));
    console.log('CALLBACK COMPLETADO');
    console.log('='.repeat(80));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Callback completed',
        ipp_job_id: ippJobId,
        cliente: cliente,
        process_id: processId,
        all_completed: todosCompletos
      })
    };
    
  } catch (error) {
    console.error('ERROR en factor-completion-callback:', error);
    console.error('Stack trace:', error.stack);
    
    // No fallar el proceso, solo loggear
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error in callback',
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
// ACTUALIZAR DYNAMODB IPP CON RESULTADO DE UN CLIENTE
// ==========================================================
async function actualizarIPPConResultadoFactor(ippJobId, cliente, processId, status, resultPath) {
  const IPP_JOBS_TABLE = process.env.IPP_JOBS_TABLE;
  
  console.log(`\nActualizando DynamoDB IPP para cliente ${cliente}...`);
  
  try {
    // Leer el job actual para obtener el estado de otros clientes
    const currentJob = await docClient.send(new GetCommand({
      TableName: IPP_JOBS_TABLE,
      Key: { job_id: ippJobId }
    }));
    
    if (!currentJob.Item) {
      console.warn(`WARNING: IPP Job ${ippJobId} no encontrado en DynamoDB`);
      return;
    }
    
    // Obtener factor_results actual o crear objeto vacío
    const factorResults = currentJob.Item.factor_results || {};
    
    // Agregar/actualizar resultado de este cliente
    factorResults[cliente] = {
      process_id: processId,
      status: status,
      result_path: resultPath,
      completed_at: new Date().toISOString()
    };
    
    // Actualizar DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: IPP_JOBS_TABLE,
      Key: { job_id: ippJobId },
      UpdateExpression: 'SET factor_results = :results, updated_at = :time, #s = :status',
      ExpressionAttributeNames: {
        '#s': 'status'
      },
      ExpressionAttributeValues: {
        ':results': factorResults,
        ':time': new Date().toISOString(),
        ':status': 'factor_processing'  // Estado intermedio
      }
    }));
    
    console.log(`   Cliente ${cliente} registrado en IPP job ${ippJobId}`);
    console.log(`   Result Path: ${resultPath}`);
    
  } catch (error) {
    console.error(`   ERROR actualizando DynamoDB IPP:`, error.message);
    throw error;
  }
}

// ==========================================================
// VERIFICAR SI TODOS LOS CLIENTES TERMINARON
// ==========================================================
async function verificarTodosClientesCompletos(ippJobId) {
  const IPP_JOBS_TABLE = process.env.IPP_JOBS_TABLE;
  
  console.log(`\nVerificando si todos los clientes terminaron...`);
  
  try {
    const job = await docClient.send(new GetCommand({
      TableName: IPP_JOBS_TABLE,
      Key: { job_id: ippJobId }
    }));
    
    if (!job.Item) {
      console.warn(`WARNING: Job ${ippJobId} no encontrado`);
      return false;
    }
    
    const totalClientes = job.Item.total_clientes || 0;
    const factorResults = job.Item.factor_results || {};
    const clientesCompletados = Object.keys(factorResults).length;
    
    console.log(`   Clientes completados: ${clientesCompletados}/${totalClientes}`);
    
    // Verificar que todos estén completados
    const todosCompletados = clientesCompletados === totalClientes &&
                             Object.values(factorResults).every(r => r.status === 'COMPLETED');
    
    if (todosCompletados) {
      console.log(`   Todos los ${totalClientes} clientes completados`);
    } else {
      console.log(`   Faltan clientes por completar`);
      
      // Mostrar estado de cada cliente
      for (const [cliente, result] of Object.entries(factorResults)) {
        console.log(`      - Cliente ${cliente}: ${result.status}`);
      }
    }
    
    return todosCompletados;
    
  } catch (error) {
    console.error(`   ERROR verificando clientes:`, error.message);
    return false;
  }
}

// ==========================================================
// ACTUALIZAR ESTADO FINAL DEL IPP
// ==========================================================
async function actualizarEstadoFinalIPP(ippJobId) {
  const IPP_JOBS_TABLE = process.env.IPP_JOBS_TABLE;
  
  console.log(`\nActualizando estado final del IPP...`);
  
  try {
    await docClient.send(new UpdateCommand({
      TableName: IPP_JOBS_TABLE,
      Key: { job_id: ippJobId },
      UpdateExpression: 'SET #s = :status, completed_at = :time',
      ExpressionAttributeNames: {
        '#s': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'factor_completed',
        ':time': new Date().toISOString()
      }
    }));
    
    console.log(`   IPP Job ${ippJobId} marcado como completado`);
    
  } catch (error) {
    console.error(`   ERROR actualizando estado final:`, error.message);
    throw error;
  }
}
