const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.CONFIG_TABLE;

// Función helper para CORS dinámico
const getCorsHeaders = (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
  
  // Si el origin está en la lista permitida, devuélvelo
  // Si no, usa el primero de la lista o '*'
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '*');
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };
};

exports.handler = async (event) => {
  console.log('READ Config - Evento recibido:', JSON.stringify(event, null, 2));

  const corsHeaders = getCorsHeaders(event);

  // Manejar OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const mostradorId = event.pathParameters?.mostradorId;

    if (mostradorId) {
      // Obtener configuración específica
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { mostradorId }
      }));

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Configuración no encontrada' 
          })
        };
      }

      console.log('✅ Configuración encontrada:', mostradorId);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ config: result.Item })
      };

    } else {
      // Listar todas las configuraciones
      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME
      }));

      console.log(`✅ ${result.Items.length} configuraciones encontradas`);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          configs: result.Items,
          count: result.Items.length
        })
      };
    }

  } catch (error) {
    console.error('❌ Error leyendo configuración:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      })
    };
  }
};

