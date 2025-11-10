const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// 🔐 ORÍGENES PERMITIDOS PARA CORS
const ALLOWED_ORIGINS = [
    'http://factor-redondeo-v3-frontend-dev.s3-website-us-east-1.amazonaws.com',
    'http://factor-redondeo-lambda-frontend.s3-website-us-east-1.amazonaws.com'
];

// Helper para obtener el origen correcto según el request
const getCorsOrigin = (event) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
};

exports.handler = async (event) => {
    console.log('Generando URL pre-firmada para upload directo a S3...');
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // 🔐 EXTRAER INFORMACIÓN DEL USUARIO AUTENTICADO
        let userInfo = null;
        if (event.requestContext?.authorizer?.claims) {
            const claims = event.requestContext.authorizer.claims;
            userInfo = {
                email: claims.email || claims['cognito:username'],
                username: claims['cognito:username'],
                sub: claims.sub
            };
            console.log('👤 Usuario autenticado:', userInfo.email);
        }
        
        // Parsear body si viene del API Gateway
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event;
        
        const { fileName, contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } = body;
        
        if (!fileName) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': getCorsOrigin(event),
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                body: JSON.stringify({ 
                    error: 'fileName es requerido en el body' 
                })
            };
        }

        const bucket = process.env.S3_UPLOADS_BUCKET || 'factor-redondeo-lambda-uploads-dev';
        
        // 🔐 Incluir username en el key para trazabilidad
        const userPrefix = userInfo ? `${userInfo.username}/` : '';
        const key = `uploads/${userPrefix}${Date.now()}-${fileName}`;

        console.log(`📤 Generando presigned URL para: s3://${bucket}/${key}`);

        // Crear comando de PutObject
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType
        });

        // Generar URL pre-firmada válida por 15 minutos
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

        console.log('URL pre-firmada generada exitosamente');

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': getCorsOrigin(event),
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
                presignedUrl,
                bucket,
                key,
                expiresIn: 900
            })
        };

    } catch (error) {
        console.error('Error generando presigned URL:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': getCorsOrigin(event),
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ 
                error: 'Error generando presigned URL',
                details: error.message 
            })
        };
    }
};

