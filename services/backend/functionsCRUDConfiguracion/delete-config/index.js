const { executeQuery } = require('../../shared/databricks');

// Función helper para CORS dinámico
const getCorsHeaders = (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
  
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '*');
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
  };
};

exports.handler = async (event) => {
  console.log('DELETE Config (Databricks) - Evento recibido:', JSON.stringify(event, null, 2));

  const corsHeaders = getCorsHeaders(event);

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

    const query = `
      DELETE FROM invenadro.bronze.invenadro_input_automatizacion
      WHERE mostrador = :mostrador
    `;

    const parameters = [
      { name: 'mostrador', value: Number(mostradorId), type: 'LONG' }
    ];

    console.log('Ejecutando DELETE en Databricks...');
    await executeQuery(query, { parameters });

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
