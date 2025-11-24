const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

//ORÍGENES PERMITIDOS PARA CORS - Desde variable de entorno por ambiente
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
    console.log('Generando URL pre-firmada para upload directo a S3...');
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        //EXTRAER INFORMACIÓN DEL USUARIO AUTENTICADO
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

        //VALIDAR VARIABLE DE ENTORNO
        const bucket = process.env.UPLOADS_BUCKET;
        if (!bucket) {
            throw new Error('UPLOADS_BUCKET no está configurado en variables de entorno');
        }
        
        // 🔐 Incluir username en el key para trazabilidad
        const userPrefix = userInfo ? `${userInfo.username}/` : '';
        const key = `uploads/${userPrefix}${Date.now()}-${fileName}`;

        console.log(`Generando presigned URL para: s3://${bucket}/${key}`);

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

