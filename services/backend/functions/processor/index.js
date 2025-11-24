const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { procesarExcelConConfiguracion } = require('./invenadroCalc_modular');
const { initializeDatabricks } = require('./utils/parameterStore');

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    try {
        console.log('Evento recibido en lambda-processor:', JSON.stringify(event, null, 2));
        
        // INICIALIZAR DATABRICKS desde Parameter Store
        console.log('[INIT] Inicializando credenciales de Databricks...');
        try {
            await initializeDatabricks();
            console.log('[INIT] Databricks inicializado correctamente');
        } catch (error) {
            console.error('[INIT] Error inicializando Databricks:', error.message);
            console.warn('[INIT] Continuando sin Databricks (ventas en 0)');
        }
        
        // VALIDAR VARIABLES DE ENTORNO
        const JOBS_TABLE = process.env.JOBS_TABLE;
        const RESULTS_BUCKET = process.env.RESULTS_BUCKET;
        if (!JOBS_TABLE) {
            throw new Error(' JOBS_TABLE no está configurado en variables de entorno');
        }
        if (!RESULTS_BUCKET) {
            throw new Error('RESULTS_BUCKET no está configurado en variables de entorno');
        }
        
        // Extraer datos del evento
        const { s3Bucket, s3Key, customConfig, processId } = event;
        
        if (!s3Bucket || !s3Key) {
            throw new Error('s3Bucket y s3Key son requeridos');
        }
        
        // Actualizar estado a PROCESSING
        console.log('Actualizando estado a PROCESSING en DynamoDB...');
        await dynamoDB.send(new UpdateItemCommand({
            TableName: JOBS_TABLE,
            Key: { processId: { S: processId } },
            UpdateExpression: "SET #status = :status, processingStartTime = :time",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":status": { S: "PROCESSING" },
                ":time": { S: new Date().toISOString() }
            }
        }));
        
        console.log('Estado actualizado a PROCESSING');
        
        // ✅ DESCARGAR ARCHIVO DE S3
        console.log('Descargando archivo de S3...');
        const getObjectResponse = await s3.send(new GetObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key
        }));
        
        // Convertir stream a buffer
        const streamToBuffer = async (stream) => {
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        };
        
        const fileBuffer = await streamToBuffer(getObjectResponse.Body);
        console.log('Archivo descargado de S3, tamaño:', fileBuffer.length, 'bytes');
        
        // ✅ PROCESAR EXCEL CON LÓGICA REAL
        console.log('Procesando Excel con configuración:', customConfig);
        const resultado = await procesarExcelConConfiguracion(fileBuffer, customConfig);
        
        console.log('Excel procesado exitosamente:', {
            registros: resultado.resumenFinal.registros,
            factorOptimo: resultado.resumenFinal.factorOptimo,
            registrosMayorCero: resultado.resumenFinal.registrosMayorCero
        });
        
        // Guardar resultado completo en S3
        console.log('Guardando resultado en S3...');
        const resultsBucket = RESULTS_BUCKET;
        const resultKey = `resultados/${processId}/resultado.json`;
        
        // Preparar datos completos para el frontend (estructura como en BackEnd)
        const resultadoCompleto = {
            processId: processId,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED',
            customConfig: customConfig,
            
            // Datos principales del procesamiento
            totalFilasOriginales: resultado.datos?.length || 0,
            registrosTotales: resultado.resumenFinal.registros,
            registrosMayorCero: resultado.resumenFinal.registrosMayorCero,
            factorRedondeoEncontrado: resultado.factorRedondeoEncontrado,
            tiempoEjecucion: resultado.resumenFinal.tiempoEjecucion || 'N/A',
            
            // Datos financieros para el frontend
            resumenFinal: resultado.resumenFinal,
            datosOptimizacion: resultado.resumenFinal.datosOptimizacion || [],
            convergenciaData: resultado.convergenciaData || [], // ✅ AGREGADO: Datos de convergencia
            
            // URLs de archivos (si existen)
            rutaArchivoExcel: resultado.rutaArchivoExcel,
            archivoSalidaExcel: resultado.archivoSalidaExcel,
            archivoSalidaCSV: resultado.archivoSalidaCSV,
            
            // Datos completos para cálculos del frontend
            datos: resultado.datos // Los datos procesados completos
        };
        
        await s3.send(new PutObjectCommand({
            Bucket: resultsBucket,
            Key: resultKey,
            Body: JSON.stringify(resultadoCompleto, null, 2),
            ContentType: 'application/json'
        }));
        
        console.log('Resultado guardado en S3:', `s3://${resultsBucket}/${resultKey}`);
        
        // Actualizar estado a PROCESSED
        console.log('Actualizando estado a PROCESSED en DynamoDB...');
        await dynamoDB.send(new UpdateItemCommand({
            TableName: JOBS_TABLE,
            Key: { processId: { S: processId } },
            UpdateExpression: "SET #status = :status, processingEndTime = :time",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":status": { S: "PROCESSED" },
                ":time": { S: new Date().toISOString() }
            }
        }));
        
        console.log('Estado actualizado a PROCESSED');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Excel procesado exitosamente',
                processId: processId,
                status: 'PROCESSED',
                customConfig: customConfig,
                resultado: {
                    registros: resultado.resumenFinal.registros,
                    registrosMayorCero: resultado.resumenFinal.registrosMayorCero,
                    sumaTotal: resultado.resumenFinal.sumaTotal,
                    factorOptimo: resultado.resumenFinal.factorOptimo,
                    diasInversionDeseados: resultado.resumenFinal.diasInversionDeseados,
                    inversionOriginal: resultado.resumenFinal.inversionOriginal,
                    inversionDeseada: resultado.resumenFinal.inversionDeseada,
                    tiempoEjecucionMs: resultado.resumenFinal.tiempoEjecucionMs,
                    archivoExcelGenerado: resultado.archivoSalidaExcel
                }
            })
        };
        
    } catch (error) {
        console.error('Error en lambda-processor:', error);
        
        // Actualizar estado a FAILED si hay error
        try {
            if (event.processId) {
                await dynamoDB.send(new UpdateItemCommand({
                    TableName: process.env.JOBS_TABLE || 'invenadro-backend-jul-dev-jobs',
                    Key: { processId: { S: event.processId } },
                    UpdateExpression: "SET #status = :status, errorMessage = :error, errorTime = :time",
                    ExpressionAttributeNames: { "#status": "status" },
                    ExpressionAttributeValues: {
                        ":status": { S: "FAILED" },
                        ":error": { S: error.message },
                        ":time": { S: new Date().toISOString() }
                    }
                }));
            }
        } catch (dbError) {
            console.error('Error actualizando estado en DynamoDB:', dbError);
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error procesando Excel',
                error: error.message,
                processId: event.processId
            })
        };
    }
};
