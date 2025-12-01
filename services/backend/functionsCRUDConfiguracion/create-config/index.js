const { executeQuery } = require('../../shared/databricks');

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
  console.log('CREATE Config (Databricks) - Evento recibido:', JSON.stringify(event, null, 2));

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

    // Preparar datos para Databricks
    const mostrador = Number(body.mostrador);
    const tipo_inventario = body.tipoInvenadro;
    const monto_deseado = Number(body.montoRequerido);
    const fecha_actualizacion = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Helper para convertir booleanos/strings a booleanos de SQL
    const toBool = (val) => (val === 'S' || val === true || val === 'true');

    // Query parametrizado para inserción
    const query = `
      INSERT INTO invenadro.bronze.invenadro_input_automatizacion (
        mostrador,
        tipo_inventario,
        monto_deseado,
        incluye_refrigerados,
        incluye_psicotropicos,
        incluye_especialidades,
        incluye_genericos,
        incluye_dispositivos_medicos,
        incluye_complementos_alimenticios,
        incluye_dermatologico,
        incluye_otc,
        incluye_etico_patente,
        fecha_actualizacion
      ) VALUES (
        :mostrador,
        :tipo_inventario,
        :monto_deseado,
        :incluye_refrigerados,
        :incluye_psicotropicos,
        :incluye_especialidades,
        :incluye_genericos,
        :incluye_dispositivos_medicos,
        :incluye_complementos_alimenticios,
        :incluye_dermatologico,
        :incluye_otc,
        :incluye_etico_patente,
        :fecha_actualizacion
      )
    `;

    const parameters = [
      { name: 'mostrador', value: mostrador, type: 'LONG' },
      { name: 'tipo_inventario', value: tipo_inventario, type: 'STRING' },
      { name: 'monto_deseado', value: monto_deseado, type: 'DOUBLE' },
      { name: 'incluye_refrigerados', value: toBool(body.incluye_Refrigerados), type: 'BOOLEAN' },
      { name: 'incluye_psicotropicos', value: toBool(body.incluye_Psicotropicos), type: 'BOOLEAN' },
      { name: 'incluye_especialidades', value: toBool(body.incluye_Especialidades), type: 'BOOLEAN' },
      { name: 'incluye_genericos', value: toBool(body.incluye_Genericos), type: 'BOOLEAN' },
      { name: 'incluye_dispositivos_medicos', value: toBool(body.incluye_Dispositivos_Medicos), type: 'BOOLEAN' },
      { name: 'incluye_complementos_alimenticios', value: toBool(body.incluye_Complementos_Alimenticios), type: 'BOOLEAN' },
      { name: 'incluye_dermatologico', value: toBool(body.incluye_Dermatologico), type: 'BOOLEAN' },
      { name: 'incluye_otc', value: toBool(body.incluye_OTC), type: 'BOOLEAN' },
      { name: 'incluye_etico_patente', value: toBool(body.incluye_Etico_Patente), type: 'BOOLEAN' },
      { name: 'fecha_actualizacion', value: fecha_actualizacion, type: 'DATE' }
    ];

    console.log('Ejecutando INSERT en Databricks...');
    await executeQuery(query, { parameters });

    console.log('✅ Configuración creada en Databricks para mostrador:', mostrador);

    // Construir objeto de respuesta similar al anterior para mantener compatibilidad con frontend
    const config = {
      mostradorId: mostrador.toString(), // Frontend espera mostradorId
      mostrador: mostrador,
      tipoInvenadro: tipo_inventario,
      montoRequerido: monto_deseado,
      // Devolver los valores originales para consistencia
      incluye_Refrigerados: body.incluye_Refrigerados,
      incluye_Psicotropicos: body.incluye_Psicotropicos,
      incluye_Especialidades: body.incluye_Especialidades,
      incluye_Genericos: body.incluye_Genericos,
      incluye_Dispositivos_Medicos: body.incluye_Dispositivos_Medicos,
      incluye_Complementos_Alimenticios: body.incluye_Complementos_Alimenticios,
      incluye_Dermatologico: body.incluye_Dermatologico,
      incluye_OTC: body.incluye_OTC,
      incluye_Etico_Patente: body.incluye_Etico_Patente,
      updatedAt: new Date().toISOString()
    };

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
