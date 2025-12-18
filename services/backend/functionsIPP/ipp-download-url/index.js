const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'mx-central-1' });

/**
 * Lambda: Generar URL pre-firmada para descargar archivos de S3
 * 
 * Este endpoint genera URLs pre-firmadas que permiten descargar archivos
 * de S3 sin exponer credenciales en el frontend.
 */
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    console.log('Generando URL de descarga...');
    
    // Parsear body
    const body = JSON.parse(event.body || '{}');
    const { bucket, key } = body;

    // Validar parámetros
    if (!bucket || !key) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required parameters',
          message: 'bucket and key are required'
        })
      };
    }

    console.log(`Generando URL para: s3://${bucket}/${key}`);

    // Generar URL pre-firmada (válida por 5 minutos)
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300 // 5 minutos
    });

    console.log('URL generada exitosamente');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        url: signedUrl,
        expiresIn: 300
      })
    };

  } catch (error) {
    console.error('Error generando URL:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};

