const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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
    'Access-Control-Allow-Methods': 'PUT,OPTIONS'
  };
};

exports.handler = async (event) => {
  console.log('UPDATE Config - Evento recibido:', JSON.stringify(event, null, 2));

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
    const body = JSON.parse(event.body);

    if (!mostradorId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'mostradorId es requerido' })
      };
    }

    // Construir expresión de actualización dinámica
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    const allowedFields = [
      'mostrador', 'tipoInvenadro', 'montoRequerido',
      'incluye_Refrigerados', 'incluye_Psicotropicos', 'incluye_Especialidades',
      'incluye_Genericos', 'incluye_Dispositivos_Medicos', 
      'incluye_Complementos_Alimenticios', 'incluye_Dermatologico',
      'incluye_OTC', 'incluye_Etico_Patente'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    // Agregar timestamp de actualización
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 1) { // Solo timestamp
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No hay campos para actualizar' })
      };
    }

    // Actualizar en DynamoDB
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { mostradorId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    console.log('✅ Configuración actualizada:', mostradorId);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Configuración actualizada exitosamente',
        config: result.Attributes
      })
    };

  } catch (error) {
    console.error('❌ Error actualizando configuración:', error);
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

