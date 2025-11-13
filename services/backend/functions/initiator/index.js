const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const stepFunctions = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

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
        console.log('Evento recibido:', JSON.stringify(event, null, 2));
        
        // 🔐 EXTRAER INFORMACIÓN DEL USUARIO AUTENTICADO
        let userInfo = null;
        if (event.requestContext?.authorizer?.claims) {
            const claims = event.requestContext.authorizer.claims;
            userInfo = {
                email: claims.email || claims['cognito:username'],
                username: claims['cognito:username'],
                sub: claims.sub, // ID único del usuario en Cognito
                name: claims.name || claims.email
            };
            console.log('👤 Usuario autenticado:', userInfo);
        }
        
        // Parsear el body si viene de API Gateway
        let requestData;
        if (event.body) {
            // Viene de API Gateway
            requestData = JSON.parse(event.body);
        } else {
            // Llamada directa
            requestData = event;
        }
        
        // Extraer datos del evento
        const { s3Key, s3Bucket, customConfig, originalname } = requestData;
        
        // Validar que se recibió la ubicación S3
        if (!s3Key || !s3Bucket) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': getCorsOrigin(event),
                    'Access-Control-Allow-Methods': 'OPTIONS,POST',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'No se proporcionó la ubicación del archivo en S3',
                    error: 's3Key y s3Bucket son requeridos'
                })
            };
        }
        
        // Generar ID único para el proceso
        const processId = uuidv4();
        const bucketName = s3Bucket;
        const key = s3Key;
        
        console.log(`📦 Procesando archivo desde S3: s3://${bucketName}/${key}`);
        
        // Iniciar Step Function
        const stateMachineArn = process.env.STEP_FUNCTION_ARN;
        if (!stateMachineArn) {
            throw new Error('STEP_FUNCTION_ARN no está configurado');
        }
        
        console.log('Iniciando Step Function...');
        const startExecutionCommand = new StartExecutionCommand({
            stateMachineArn: stateMachineArn,
            name: processId,
            input: JSON.stringify({
                s3Bucket: bucketName,
                s3Key: key,
                customConfig: customConfig || {
                    factorRedondeo: 0.47,
                    joroba: 3.5,
                    diasInversionDeseados: 27
                },
                processId: processId,
                originalname: originalname || 'inventario.xlsx'
            })
        });
        
        const executionResult = await stepFunctions.send(startExecutionCommand);
        
        console.log('Step Function iniciado:', executionResult.executionArn);
        
        // Guardar estado inicial en DynamoDB
        console.log('Guardando estado en DynamoDB...');
        
        // Preparar item de DynamoDB con info del usuario
        const dynamoItem = {
            processId: { S: processId },
            status: { S: 'RUNNING' },
            startTime: { S: new Date().toISOString() },
            executionArn: { S: executionResult.executionArn },
            s3Location: { 
                M: { 
                    bucket: { S: bucketName }, 
                    key: { S: key } 
                } 
            },
            customConfig: { 
                M: { 
                    factorRedondeo: { N: String(customConfig?.factorRedondeo || 0.47) },
                    joroba: { N: String(customConfig?.joroba || 3.5) },
                    diasInversionDeseados: { N: String(customConfig?.diasInversionDeseados || 27) }
                } 
            },
            originalname: { S: originalname || 'inventario.xlsx' }
        };
        
        // 🔐 AGREGAR INFO DEL USUARIO (para auditoría)
        if (userInfo) {
            dynamoItem.user = {
                M: {
                    email: { S: userInfo.email },
                    username: { S: userInfo.username },
                    sub: { S: userInfo.sub }
                }
            };
        }
        
        await dynamoDB.send(new PutItemCommand({
            TableName: process.env.JOBS_TABLE,
            Item: dynamoItem
        }));
        
        console.log('Estado guardado en DynamoDB');
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': getCorsOrigin(event),
                'Access-Control-Allow-Methods': 'OPTIONS,POST',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Proceso iniciado exitosamente',
                processId: processId,
                executionArn: executionResult.executionArn,
                status: 'RUNNING',
                s3Location: {
                    bucket: bucketName,
                    key: key
                },
                customConfig: customConfig
            })
        }; 
        
    } catch (error) {
        console.error('Error en lambda-initiator:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': getCorsOrigin(event),
                'Access-Control-Allow-Methods': 'OPTIONS,POST',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Error iniciando el proceso',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
