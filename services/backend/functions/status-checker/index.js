const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    try {
        console.log('Evento recibido en lambda-status-checker:', JSON.stringify(event, null, 2));
        
        // VALIDAR VARIABLE DE ENTORNO
        const JOBS_TABLE = process.env.JOBS_TABLE;
        if (!JOBS_TABLE) {
            throw new Error('JOBS_TABLE no está configurado en variables de entorno');
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
        
        // NUEVO: Si viene un status en el payload, ACTUALIZAR el estado en DynamoDB
        // Esto se usa cuando el Step Function detecta un error y quiere notificar al frontend
        if (event.status && (event.status === 'FAILED' || event.status === 'COMPLETED' || event.status === 'ERROR')) {
            console.log(`Actualizando estado a: ${event.status}`);
            
            const updateExpression = event.status === 'FAILED' 
                ? "SET #status = :status, errorMessage = :error, errorTime = :time, message = :message"
                : "SET #status = :status, endTime = :time, message = :message";
            
            const expressionValues = {
                ":status": { S: event.status },
                ":time": { S: new Date().toISOString() },
                ":message": { S: event.message || `Proceso en estado ${event.status}` }
            };
            
            if (event.status === 'FAILED') {
                expressionValues[":error"] = { 
                    S: event.errorDetails?.cause || event.errorDetails?.error || event.message || 'Error desconocido' 
                };
            }
            
            await dynamoDB.send(new UpdateItemCommand({
                TableName: JOBS_TABLE,
                Key: { processId: { S: processId } },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: expressionValues
            }));
            
            console.log(`Estado actualizado a ${event.status} en DynamoDB`);
            
            // Retornar inmediatamente después de actualizar
            return {
                statusCode: 200,
                body: JSON.stringify({
                    processId: processId,
                    status: event.status,
                    message: event.message,
                    updated: true
                })
            };
        }
        
        // Verificar si es monitoreo multi-cliente
        if (event.checkType === 'MULTI_CLIENT_MONITORING' && event.executions) {
            console.log('Modo MULTI_CLIENT_MONITORING detectado');
            return await monitorMultiClientExecutions(event.executions);
        }
        
        // Consultar estado actual en DynamoDB
        console.log('Consultando estado actual en DynamoDB...');
        const getResult = await dynamoDB.send(new GetItemCommand({
            TableName: JOBS_TABLE,
            Key: { processId: { S: processId } }
        }));
        
        if (!getResult.Item) {
            throw new Error(`Proceso ${processId} no encontrado`);
        }
        
        // Extraer datos del item
        const currentStatus = getResult.Item.status?.S || 'UNKNOWN';
        const startTime = getResult.Item.startTime?.S;
        const endTime = getResult.Item.endTime?.S;
        const errorMessage = getResult.Item.errorMessage?.S;
        const message = getResult.Item.message?.S; // ✅ NUEVO: Mensaje de progreso detallado
        
        console.log('Estado encontrado:', currentStatus);
        console.log('Mensaje de progreso:', message);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                processId: processId,
                status: currentStatus,
                startTime: startTime,
                endTime: endTime,
                errorMessage: errorMessage,
                message: message, //NUEVO: Incluir mensaje de progreso
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error en lambda-status-checker:', error);
        
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
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Error verificando estado',
                error: error.message,
                processId: event.pathParameters?.processId || event.processId,
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * Monitorea múltiples ejecuciones de Step Functions para procesamiento multi-cliente
 */
async function monitorMultiClientExecutions(executions) {
    const { SFNClient, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');
    const stepFunctions = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
    
    console.log(`🔍 Monitoreando ${executions.length} ejecuciones multi-cliente`);
    
    let completedCount = 0;
    let failedCount = 0;
    let runningCount = 0;
    const executionStatuses = [];
    
    // Verificar estado de cada ejecución
    for (const execution of executions) {
        try {
            const result = await stepFunctions.send(new DescribeExecutionCommand({
                executionArn: execution.executionArn
            }));
            
            const status = result.status;
            executionStatuses.push({
                cliente: execution.cliente,
                status: status,
                executionArn: execution.executionArn
            });
            
            if (status === 'SUCCEEDED') {
                completedCount++;
            } else if (status === 'FAILED' || status === 'TIMED_OUT' || status === 'ABORTED') {
                failedCount++;
            } else if (status === 'RUNNING') {
                runningCount++;
            }
            
            console.log(`Cliente ${execution.cliente}: ${status}`);
            
        } catch (error) {
            console.error(`Error verificando ejecución ${execution.executionArn}:`, error);
            failedCount++;
            executionStatuses.push({
                cliente: execution.cliente,
                status: 'ERROR',
                error: error.message,
                executionArn: execution.executionArn
            });
        }
    }
    
    const totalExecutions = executions.length;
    const allCompleted = (completedCount + failedCount) === totalExecutions;
    const hasErrors = failedCount > 0;
    
    console.log(`Resumen: ${completedCount} completados, ${failedCount} fallidos, ${runningCount} ejecutándose`);
    
    // Devolver resultado para el Step Function
    return {
        allCompleted: allCompleted,
        hasErrors: hasErrors,
        totalExecutions: totalExecutions,
        completedCount: completedCount,
        failedCount: failedCount,
        runningCount: runningCount,
        executionStatuses: executionStatuses,
        timestamp: new Date().toISOString()
    };
}
