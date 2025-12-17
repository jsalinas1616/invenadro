const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const XLSX = require('xlsx');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    try {
        console.log('CLIENT AGGREGATOR - Evento recibido:', JSON.stringify(event, null, 2));
        
        // VALIDAR VARIABLES DE ENTORNO
        const JOBS_TABLE = process.env.JOBS_TABLE;
        const RESULTS_BUCKET = process.env.RESULTS_BUCKET;
        if (!JOBS_TABLE) {
            throw new Error('JOBS_TABLE no está configurado en variables de entorno');
        }
        if (!RESULTS_BUCKET) {
            throw new Error('RESULTS_BUCKET no está configurado en variables de entorno');
        }
        
        const { processId, s3Bucket } = event;
        
        if (!processId) {
            throw new Error('processId es requerido');
        }
        
        // Actualizar estado en DynamoDB
        await updateDynamoDBStatus(processId, 'AGGREGATING', 'Iniciando agregación de resultados multi-cliente...', JOBS_TABLE);
        
        // Obtener información de las ejecuciones
        console.log('Obteniendo información de ejecuciones...');
        const executionsInfo = await getExecutionsInfo(s3Bucket, processId);
        
        console.log('Información de ejecuciones:', {
            totalClientes: executionsInfo.totalClientes,
            clientes: executionsInfo.executions.map(e => e.cliente)
        });
        
        // Recopilar resultados de cada cliente
        console.log('Recopilando resultados de cada cliente...');
        const resultadosClientes = await recopilarResultadosClientes(s3Bucket, executionsInfo, RESULTS_BUCKET);
        
        // Generar reporte consolidado
        console.log('Generando reporte consolidado...');
        const reporteConsolidado = await generarReporteConsolidado(resultadosClientes, executionsInfo);
        
        // Generar Excel consolidado
        console.log('Generando Excel consolidado...');
        const archivoExcelConsolidado = await generarExcelConsolidado(resultadosClientes, executionsInfo);
        
        // 🔧 FIX: Guardar en el bucket de RESULTS, no en UPLOADS
        const resultsBucket = RESULTS_BUCKET;
        
        // Subir reporte consolidado a S3 (multi-cliente va en carpeta especial)
        // Nueva estructura: resultados/multi-cliente/{processId}/
        const reporteKey = `resultados/multi-cliente/${processId}/resultado.json`;
        console.log(`Guardando consolidado en: ${reporteKey}`);
        await s3.send(new PutObjectCommand({
            Bucket: resultsBucket,
            Key: reporteKey,
            Body: JSON.stringify(reporteConsolidado, null, 2),
            ContentType: 'application/json'
        }));
        
        // Subir Excel consolidado a S3
        const excelKey = `resultados/multi-cliente/${processId}/consolidado.xlsx`;
        await s3.send(new PutObjectCommand({
            Bucket: resultsBucket,
            Key: excelKey,
            Body: archivoExcelConsolidado,
            ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }));
        
        // Actualizar estado final en DynamoDB
        await updateDynamoDBStatus(processId, 'COMPLETED', 
            `Agregación completada - ${executionsInfo.totalClientes} clientes procesados`, JOBS_TABLE);
        
        console.log('✅ Agregación completada exitosamente');
        
        return {
            statusCode: 200,
            processId: processId,
            tipoProcesso: 'MULTI_CLIENT_AGGREGATED',
            totalClientes: executionsInfo.totalClientes,
            reporteConsolidado: reporteConsolidado,
            archivoExcel: excelKey,
            archivoReporte: reporteKey
        };
        
    } catch (error) {
        console.error('Error en client-aggregator:', error);
        
        // Actualizar estado de error en DynamoDB
        if (event.processId) {
            const JOBS_TABLE_FALLBACK = process.env.JOBS_TABLE || 'invenadro-backend-jul-dev-jobs';
            await updateDynamoDBStatus(event.processId, 'ERROR', `Error en agregación: ${error.message}`, JOBS_TABLE_FALLBACK);
        }
        
        throw error;
    }
};

/**
 * OBTENER INFORMACIÓN DE EJECUCIONES
 */
async function getExecutionsInfo(bucket, processId) {
    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: bucket,
            Key: `executions/${processId}/executions-info.json`
        }));
        
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const content = Buffer.concat(chunks).toString();
        return JSON.parse(content);
        
    } catch (error) {
        console.error('Error obteniendo info de ejecuciones:', error);
        throw new Error(`No se pudo obtener información de ejecuciones: ${error.message}`);
    }
}

/**
 * RECOPILAR RESULTADOS DE CADA CLIENTE - OPTIMIZADO
 * Solo extrae los datos necesarios, no todo el resultado completo
 */
async function recopilarResultadosClientes(bucket, executionsInfo, resultsBucket) {
    const resultados = [];
    const JOBS_TABLE = process.env.JOBS_TABLE || 'invenadro-backend-jul-dev-jobs';
    
    for (let i = 0; i < executionsInfo.executions.length; i++) {
        const execution = executionsInfo.executions[i];
        try {
            console.log(`[${i + 1}/${executionsInfo.executions.length}] Cliente: ${execution.cliente}`);
            
            // Actualizar progreso en DynamoDB cada 5 clientes
            if (i % 5 === 0 || i === executionsInfo.executions.length - 1) {
                await updateDynamoDBStatus(
                    executionsInfo.processIdOriginal,
                    'AGGREGATING',
                    `Consolidando resultados: ${i + 1}/${executionsInfo.executions.length} clientes procesados`,
                    JOBS_TABLE
                );
            }
            
            // Intentar obtener el resultado del cliente
            // Ruta única por cliente (siempre el último resultado)
            const resultadoKey = `resultados/${execution.cliente}/resultado.json`;
            console.log(`Leyendo resultado de: ${resultadoKey}`);
            
            const response = await s3.send(new GetObjectCommand({
                Bucket: resultsBucket,
                Key: resultadoKey
            }));
            
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            const content = Buffer.concat(chunks).toString();
            const resultado = JSON.parse(content);
            
            // SOLO extraer datos esenciales, NO todo el resultado
            resultados.push({
                cliente: execution.cliente,
                processId: execution.processId,
                totalRegistros: execution.totalRegistros,
                resultado: {
                    // Solo campos necesarios para el resumen
                    registrosTotales: resultado.registrosTotales,
                    totalFilasOriginales: resultado.totalFilasOriginales,
                    totalFilasExportadas: resultado.totalFilasExportadas,
                    factorRedondeoEncontrado: resultado.factorRedondeoEncontrado,
                    configUsada: resultado.configUsada,
                    resumenFinal: resultado.resumenFinal,
                    tiempoCalculoMs: resultado.tiempoCalculoMs,
                    convergenciaData: resultado.convergenciaData
                    // NO incluir 'datos' (array gigante)
                },
                status: 'SUCCESS'
            });
            
            // Liberar memoria del resultado completo
            chunks.length = 0;
            
            console.log(`Resultado obtenido para ${execution.cliente}: ${resultado.resumenFinal?.registros || 'N/A'} registros`);
            
        } catch (error) {
            console.error(`Error obteniendo resultado para ${execution.cliente}:`, error);
            
            resultados.push({
                cliente: execution.cliente,
                processId: execution.processId,
                totalRegistros: execution.totalRegistros,
                resultado: null,
                status: 'ERROR',
                error: error.message
            });
        }
    }
    
    return resultados;
}

/**
 * GENERAR REPORTE CONSOLIDADO
 */
async function generarReporteConsolidado(resultadosClientes, executionsInfo) {
    const clientesExitosos = resultadosClientes.filter(r => r.status === 'SUCCESS');
    const clientesConError = resultadosClientes.filter(r => r.status === 'ERROR');
    
    // Estadísticas consolidadas
    const estadisticasConsolidadas = {
        totalClientes: executionsInfo.totalClientes,
        clientesExitosos: clientesExitosos.length,
        clientesConError: clientesConError.length,
        porcentajeExito: Math.round((clientesExitosos.length / executionsInfo.totalClientes) * 100),
        
        // Totales generales
        totalRegistrosOriginales: clientesExitosos.reduce((sum, r) => sum + (r.resultado?.totalFilasOriginales || 0), 0),
        totalRegistrosExportados: clientesExitosos.reduce((sum, r) => sum + (r.resultado?.totalFilasExportadas || 0), 0),
        
        // Factores promedio
        factorPromedioGeneral: calcularFactorPromedio(clientesExitosos),
        
        // Tiempo total aproximado
        tiempoProcesamientoTotal: clientesExitosos.reduce((sum, r) => sum + (r.resultado?.tiempoCalculoMs || 0), 0)
    };
    
    // Resumen por cliente
    const resumenPorCliente = resultadosClientes.map(r => ({
        cliente: r.cliente,
        status: r.status,
        registrosOriginales: r.resultado?.registrosTotales || r.resultado?.totalFilasOriginales || 0,
        registrosExportados: r.resultado?.resumenFinal?.registros || r.resultado?.totalFilasExportadas || 0,
        registrosMayorCero: r.resultado?.resumenFinal?.registrosMayorCero || 0,
        factorOptimo: r.resultado?.factorRedondeoEncontrado || r.resultado?.resumenFinal?.factorOptimo || r.resultado?.configUsada?.factorRedondeo || null,
        inversionOriginal: r.resultado?.resumenFinal?.inversionOriginal || 0,
        inversionDeseada: r.resultado?.resumenFinal?.inversionDeseada || 0,
        sumaTotal: r.resultado?.resumenFinal?.sumaTotal || 0,
        diferencia: (r.resultado?.resumenFinal?.sumaTotal || 0) - (r.resultado?.resumenFinal?.inversionDeseada || 0),
        diasEquivalentes: r.resultado?.resumenFinal?.diasInversionDeseados || 0,
        tiempoCalculoMs: r.resultado?.resumenFinal?.tiempoEjecucionMs || r.resultado?.tiempoCalculoMs || 0,
        error: r.error || null
    }));
    
    // Análisis de convergencia consolidado
    const convergenciaConsolidada = clientesExitosos
        .map(r => r.resultado?.convergenciaData || [])
        .filter(conv => conv.length > 0);
    
    return {
        timestamp: new Date().toISOString(),
        processId: executionsInfo.processIdOriginal,
        tipoProcesso: 'MULTI_CLIENT_AGGREGATED',
        
        estadisticasConsolidadas,
        resumenPorCliente,
        convergenciaConsolidada,
        
        // Detalles de ejecución
        detalleEjecucion: {
            totalClientes: executionsInfo.totalClientes,
            fechaInicio: executionsInfo.timestamp,
            fechaFinalizacion: new Date().toISOString()
        }
    };
}

/**
 * GENERAR EXCEL CONSOLIDADO
 */
async function generarExcelConsolidado(resultadosClientes, executionsInfo) {
    const workbook = XLSX.utils.book_new();
    
    // HOJA 1: RESUMEN CONSOLIDADO
    const resumenData = resultadosClientes.map(r => ({
        'Cliente': r.cliente,
        'Estado': r.status,
        'Registros Originales': r.resultado?.totalFilasOriginales || 0,
        'Registros Exportados': r.resultado?.totalFilasExportados || 0,
        'Factor Óptimo': r.resultado?.configUsada?.factorRedondeo || 'N/A',
        'Tiempo (ms)': r.resultado?.tiempoCalculoMs || 0,
        'Error': r.error || ''
    }));
    
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen por Cliente');
    
    // HOJA 2: DATOS CONSOLIDADOS (todos los registros de todos los clientes)
    const datosConsolidados = [];
    
    resultadosClientes.forEach(r => {
        if (r.status === 'SUCCESS' && r.resultado?.datos) {
            r.resultado.datos.forEach(registro => {
                datosConsolidados.push({
                    'Cliente_Procesado': r.cliente,
                    ...registro
                });
            });
        }
    });
    
    if (datosConsolidados.length > 0) {
        const datosSheet = XLSX.utils.json_to_sheet(datosConsolidados);
        XLSX.utils.book_append_sheet(workbook, datosSheet, 'Datos Consolidados');
    }
    
    // HOJA 3: ESTADÍSTICAS GENERALES
    const clientesExitosos = resultadosClientes.filter(r => r.status === 'SUCCESS');
    const estadisticas = [{
        'Métrica': 'Total Clientes',
        'Valor': executionsInfo.totalClientes
    }, {
        'Métrica': 'Clientes Exitosos',
        'Valor': clientesExitosos.length
    }, {
        'Métrica': 'Clientes con Error',
        'Valor': resultadosClientes.filter(r => r.status === 'ERROR').length
    }, {
        'Métrica': 'Porcentaje de Éxito',
        'Valor': `${Math.round((clientesExitosos.length / executionsInfo.totalClientes) * 100)}%`
    }, {
        'Métrica': 'Total Registros Originales',
        'Valor': clientesExitosos.reduce((sum, r) => sum + (r.resultado?.totalFilasOriginales || 0), 0)
    }, {
        'Métrica': 'Total Registros Exportados',
        'Valor': clientesExitosos.reduce((sum, r) => sum + (r.resultado?.totalFilasExportados || 0), 0)
    }, {
        'Métrica': 'Factor Promedio General',
        'Valor': calcularFactorPromedio(clientesExitosos)
    }];
    
    const estadisticasSheet = XLSX.utils.json_to_sheet(estadisticas);
    XLSX.utils.book_append_sheet(workbook, estadisticasSheet, 'Estadísticas Generales');
    
    // Convertir workbook a buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * CALCULAR FACTOR PROMEDIO
 */
function calcularFactorPromedio(clientesExitosos) {
    const factores = clientesExitosos
        .map(r => r.resultado?.configUsada?.factorRedondeo)
        .filter(f => f && !isNaN(f));
    
    if (factores.length === 0) return 'N/A';
    
    const promedio = factores.reduce((sum, f) => sum + parseFloat(f), 0) / factores.length;
    return Math.round(promedio * 100) / 100; // Redondear a 2 decimales
}

/**
 * ACTUALIZAR ESTADO EN DYNAMODB
 */
async function updateDynamoDBStatus(processId, status, details, jobsTable) {
    try {
        await dynamoDB.send(new UpdateItemCommand({
            TableName: jobsTable,
            Key: { processId: { S: processId } },
            UpdateExpression: "SET #status = :status, #details = :details, lastUpdate = :time",
            ExpressionAttributeNames: { 
                "#status": "status",
                "#details": "details"
            },
            ExpressionAttributeValues: {
                ":status": { S: status },
                ":details": { S: details },
                ":time": { S: new Date().toISOString() }
            }
        }));
        console.log(`Estado actualizado: ${status} - ${details}`);
    } catch (error) {
        console.error('Error actualizando DynamoDB:', error);
    }
}
