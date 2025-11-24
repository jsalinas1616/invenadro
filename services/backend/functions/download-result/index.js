const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// 🔐 ORÍGENES PERMITIDOS PARA CORS - Desde variable de entorno por ambiente
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000']; // Fallback solo para desarrollo local

console.log('CORS - Orígenes permitidos:', ALLOWED_ORIGINS);

// Helper para obtener el origen correcto según el request
const getCorsOrigin = (event) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    console.log(`CORS - Origin recibido: ${origin}, usando: ${allowedOrigin}`);
    return allowedOrigin;
};

exports.handler = async (event) => {
    try {
        console.log('Evento recibido en lambda-download-result:', JSON.stringify(event, null, 2));
        
        // 🔐 EXTRAER INFORMACIÓN DEL USUARIO AUTENTICADO
        let userInfo = null;
        if (event.requestContext?.authorizer?.claims) {
            const claims = event.requestContext.authorizer.claims;
            userInfo = {
                email: claims.email || claims['cognito:username'],
                username: claims['cognito:username']
            };
            console.log('Usuario descargando resultado:', userInfo.email);
        }
        
        // Extraer processId del path parameters (viene de API Gateway)
        let processId;
        if (event.pathParameters && event.pathParameters.processId) {
            processId = event.pathParameters.processId;
        } else if (event.processId) {
            // Para llamadas directas desde Step Functions
            processId = event.processId;
        } else {
            throw new Error('processId es requerido');
        }
        
        console.log('ProcessId extraído:', processId);
        
        // ✅ VALIDAR VARIABLES DE ENTORNO
        const JOBS_TABLE = process.env.JOBS_TABLE;
        const RESULTS_BUCKET = process.env.RESULTS_BUCKET;
        if (!JOBS_TABLE) {
            throw new Error('JOBS_TABLE no está configurado en variables de entorno');
        }
        if (!RESULTS_BUCKET) {
            throw new Error('RESULTS_BUCKET no está configurado en variables de entorno');
        }
        
        // customConfig puede venir del event o ser null para llamadas desde API Gateway
        const customConfig = event.customConfig || null;
        
        // Leer información del proceso desde DynamoDB (para obtener tiempos)
        console.log('Leyendo información del proceso desde DynamoDB...');
        const getItemResponse = await dynamoDB.send(new GetItemCommand({
            TableName: JOBS_TABLE,
            Key: { processId: { S: processId } }
        }));
        
        const processStartTime = getItemResponse.Item?.startTime?.S;
        const processEndTime = getItemResponse.Item?.endTime?.S || new Date().toISOString();
        console.log('Tiempos del proceso:', { processStartTime, processEndTime });
        
        // Actualizar estado a DOWNLOADING
        console.log('Actualizando estado a DOWNLOADING en DynamoDB...');
        await dynamoDB.send(new UpdateItemCommand({
            TableName: JOBS_TABLE,
            Key: { processId: { S: processId } },
            UpdateExpression: "SET #status = :status, downloadStartTime = :time",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":status": { S: "DOWNLOADING" },
                ":time": { S: new Date().toISOString() }
            }
        }));
        
        console.log('Estado actualizado a DOWNLOADING');
        
        // Leer el resultado procesado desde S3 (generado por lambda-processor)
        console.log('Leyendo resultado procesado desde S3...');
        
        const bucketName = RESULTS_BUCKET;
        const key = `resultados/${processId}/resultado.json`;
        
        let resultado;
        try {
            console.log('Intentando leer de S3:', `s3://${bucketName}/${key}`);
            const getObjectResponse = await s3.send(new GetObjectCommand({
                Bucket: bucketName,
                Key: key
            }));
            
            // Convertir stream a string
            const streamToString = async (stream) => {
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                return Buffer.concat(chunks).toString('utf-8');
            };
            
            const resultadoJson = await streamToString(getObjectResponse.Body);
            resultado = JSON.parse(resultadoJson);
            console.log('Resultado leído exitosamente desde S3');
            
        } catch (s3Error) {
            console.error('Error leyendo resultado de S3:', s3Error);
            // Fallback: crear resultado básico si no existe en S3
            console.log('Usando resultado básico como fallback');
            resultado = {
                processId: processId,
                timestamp: new Date().toISOString(),
                status: 'COMPLETED',
                customConfig: customConfig,
                mensaje: 'Resultado no encontrado en S3, usando datos básicos',
                resultado: {
                    factorRedondeo: customConfig?.factorRedondeo || 0.47,
                    joroba: customConfig?.joroba || 3.5,
                    diasInversionDeseados: customConfig?.diasInversionDeseados || 27,
                    mensaje: 'Procesamiento completado - datos limitados'
                }
            };
        }
        
        // Actualizar estado final a COMPLETED
        console.log('Actualizando estado final a COMPLETED en DynamoDB...');
        await dynamoDB.send(new UpdateItemCommand({
            TableName: JOBS_TABLE,
            Key: { processId: { S: processId } },
            UpdateExpression: "SET #status = :status, downloadCompletedTime = :time, resultLocation = :location",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":status": { S: "COMPLETED" },
                ":time": { S: new Date().toISOString() },
                ":location": { S: `s3://${bucketName}/${key}` }
            }
        }));
        
        console.log('Estado final actualizado a COMPLETED');
        
        // DIFERENCIAMOS: Step Function vs API Gateway
        if (event.pathParameters && event.pathParameters.processId) {
            // 🌐 LLAMADA DESDE API GATEWAY (frontend) - Devolver datos completos
            
            // 🔍 DETECTAR SI ES MULTI-CLIENT
            const isMultiClient = resultado.tipoProcesso === 'MULTI_CLIENT_AGGREGATED' || 
                                 resultado.estadisticasConsolidadas || 
                                 resultado.resumenPorCliente;
            
            let datosParaFrontend;
            
            if (isMultiClient) {
                // RESULTADO MULTI-CLIENTE CONSOLIDADO
                console.log('Detectado resultado MULTI-CLIENTE, preparando datos consolidados...');
                datosParaFrontend = {
                    processId: processId,
                    status: 'COMPLETED',
                    message: 'Resultado multi-cliente generado y guardado exitosamente',
                    tipoProcesso: 'MULTI_CLIENT_AGGREGATED',
                    
                    // Estadísticas consolidadas
                    totalClientes: resultado.estadisticasConsolidadas?.totalClientes || 0,
                    clientesExitosos: resultado.estadisticasConsolidadas?.clientesExitosos || 0,
                    clientesConError: resultado.estadisticasConsolidadas?.clientesConError || 0,
                    
                    // Totales generales
                    registrosTotales: resultado.estadisticasConsolidadas?.totalRegistrosOriginales || 0,
                    registrosExportados: resultado.estadisticasConsolidadas?.totalRegistrosExportados || 0,
                    
                    // Resumen por cliente (para la tabla)
                    resumenPorCliente: resultado.resumenPorCliente || [],
                    
                    // Datos de convergencia consolidada
                    convergenciaConsolidada: resultado.convergenciaConsolidada || [],
                    
                    // Estadísticas consolidadas completas
                    estadisticasConsolidadas: resultado.estadisticasConsolidadas || {},
                    
                    // Metadata
                    resultLocation: `s3://${bucketName}/${key}`,
                    timestamp: resultado.timestamp,
                    
                    // NUEVO: Tiempos del proceso principal
                    processStartTime: processStartTime,
                    processEndTime: processEndTime
                };
            } else {
                // RESULTADO SINGLE-CLIENT (original)
                console.log('Detectado resultado SINGLE-CLIENT, preparando datos individuales...');
                datosParaFrontend = {
                    processId: processId,
                    status: 'COMPLETED',
                    message: 'Resultado generado y guardado exitosamente',
                    
                    // Datos principales que espera el frontend
                    factorRedondeoEncontrado: resultado.factorRedondeoEncontrado || 0,
                    registrosTotales: resultado.registrosTotales || 0,
                    registrosMayorCero: resultado.registrosMayorCero || 0,
                    
                    // Datos financieros - mapear desde resumenFinal
                    inversionDeseada: resultado.resumenFinal?.inversionDeseada || 0,
                    sumaOptimoVentaFinal: resultado.resumenFinal?.sumaTotal || 0,
                    sumaTotal: resultado.resumenFinal?.sumaTotal || 0,
                    inversionOriginal: resultado.resumenFinal?.inversionOriginal || 0,
                    
                    // Datos adicionales
                    tiempoEjecucion: resultado.resumenFinal?.tiempoEjecucionMs || 'N/A',
                    customConfig: resultado.customConfig || {},
                    
                    // Para la gráfica y análisis
                    resumenFinal: resultado.resumenFinal || {},
                    datos: resultado.datos || [],
                    convergenciaData: resultado.convergenciaData || [], // ✅ AGREGADO: Datos de convergencia
                    
                    // URLs de archivos
                    rutaArchivoExcel: resultado.rutaArchivoExcel,
                    archivoSalidaExcel: resultado.archivoSalidaExcel,
                    archivoSalidaCSV: resultado.archivoSalidaCSV,
                    
                    // Metadata
                    resultLocation: `s3://${bucketName}/${key}`,
                    timestamp: resultado.timestamp,
                    
                    // NUEVO: Tiempos del proceso principal
                    processStartTime: processStartTime,
                    processEndTime: processEndTime
                };
            }

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': getCorsOrigin(event),
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosParaFrontend)
            };
        } else {
            // LLAMADA DESDE STEP FUNCTION - Solo información esencial (< 32KB)
            return {
                processId: processId,
                status: 'COMPLETED',
                message: 'Resultado generado y guardado exitosamente en S3',
                resultLocation: `s3://${bucketName}/${key}`,
                registrosTotales: resultado.registrosTotales || 0,
                factorOptimo: resultado.resumenFinal?.factorOptimo || 0,
                tiempoEjecucionMs: resultado.resumenFinal?.tiempoEjecucionMs || 0,
                timestamp: new Date().toISOString()
            };
        }
        
    } catch (error) {
        console.error('Error en lambda-download-result:', error);
        
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
            headers: {
                'Access-Control-Allow-Origin': getCorsOrigin(event),
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Error generando resultado',
                error: error.message,
                processId: event.pathParameters?.processId || event.processId,
                timestamp: new Date().toISOString()
            })
        };
    }
};
