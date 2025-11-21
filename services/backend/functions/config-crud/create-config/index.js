const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

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
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
};

exports.handler = async (event) => {
  console.log('CREATE Config - Evento recibido:', JSON.stringify(event, null, 2));

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
    const body = JSON.parse(event.body);
    
    // Validar campos requeridos
    const requiredFields = ['mostrador', 'tipoInvenadro', 'montoRequerido'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: `Campo requerido faltante: ${field}` 
          })
        };
      }
    }

    // Crear configuración
    const mostradorId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const config = {
      mostradorId,
      mostrador: body.mostrador,
      tipoInvenadro: body.tipoInvenadro,
      montoRequerido: body.montoRequerido,
      incluye_Refrigerados: body.incluye_Refrigerados || 'N',
      incluye_Psicotropicos: body.incluye_Psicotropicos || 'N',
      incluye_Especialidades: body.incluye_Especialidades || 'N',
      incluye_Genericos: body.incluye_Genericos || 'N',
      incluye_Dispositivos_Medicos: body.incluye_Dispositivos_Medicos || 'N',
      incluye_Complementos_Alimenticios: body.incluye_Complementos_Alimenticios || 'N',
      incluye_Dermatologico: body.incluye_Dermatologico || 'N',
      incluye_OTC: body.incluye_OTC || 'N',
      incluye_Etico_Patente: body.incluye_Etico_Patente || 'N',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Guardar en DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: config
    }));

    console.log('✅ Configuración creada:', mostradorId);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Configuración creada exitosamente',
        config
      })
    };

  } catch (error) {
    console.error('❌ Error creando configuración:', error);
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

