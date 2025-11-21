const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.CONFIG_TABLE;

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
};

exports.handler = async (event) => {
  console.log('DELETE Config - Evento recibido:', JSON.stringify(event, null, 2));

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

    if (!mostradorId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'mostradorId es requerido' })
      };
    }

    // Eliminar de DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { mostradorId }
    }));

    console.log('✅ Configuración eliminada:', mostradorId);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Configuración eliminada exitosamente',
        mostradorId
      })
    };

  } catch (error) {
    console.error('❌ Error eliminando configuración:', error);
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

