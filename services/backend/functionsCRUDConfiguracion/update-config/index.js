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
    'Access-Control-Allow-Methods': 'PUT,OPTIONS'
  };
};

exports.handler = async (event) => {
  console.log('UPDATE Config (Databricks) - Evento recibido:', JSON.stringify(event, null, 2));

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
    const body = JSON.parse(event.body);

    if (!mostradorId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'mostradorId es requerido' })
      };
    }

    // Mapeo de campos frontend a columnas DB
    const fieldMap = {
      'tipoInvenadro': { col: 'tipo_inventario', type: 'STRING' },
      'montoRequerido': { col: 'monto_deseado', type: 'DOUBLE', transform: Number },
      'incluye_Refrigerados': { col: 'incluye_refrigerados', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_Psicotropicos': { col: 'incluye_psicotropicos', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_Especialidades': { col: 'incluye_especialidades', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_Genericos': { col: 'incluye_genericos', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_Dispositivos_Medicos': { col: 'incluye_dispositivos_medicos', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_Complementos_Alimenticios': { col: 'incluye_complementos_alimenticios', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_Dermatologico': { col: 'incluye_dermatologico', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_OTC': { col: 'incluye_otc', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true },
      'incluye_Etico_Patente': { col: 'incluye_etico_patente', type: 'BOOLEAN', transform: (v) => v === 'S' || v === true }
    };

    // Construir query dinámica
    const setClauses = [];
    const parameters = [];

    Object.keys(fieldMap).forEach(field => {
      if (body[field] !== undefined) {
        const config = fieldMap[field];
        const value = config.transform ? config.transform(body[field]) : body[field];
        
        setClauses.push(`${config.col} = :${config.col}`);
        parameters.push({ name: config.col, value: value, type: config.type });
      }
    });

    // Agregar fecha de actualización
    const fechaActualizacion = new Date().toISOString().split('T')[0];
    setClauses.push(`fecha_actualizacion = :fecha_actualizacion`);
    parameters.push({ name: 'fecha_actualizacion', value: fechaActualizacion, type: 'DATE' });

    // Agregar ID para el WHERE
    parameters.push({ name: 'mostrador_id', value: Number(mostradorId), type: 'LONG' });

    if (setClauses.length === 1) { // Solo fecha_actualizacion
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No hay campos para actualizar' })
      };
    }

    const query = `
      UPDATE invenadro.bronze.invenadro_input_automatizacion
      SET ${setClauses.join(', ')}
      WHERE mostrador = :mostrador_id
    `;

    console.log('Ejecutando UPDATE en Databricks...');
    await executeQuery(query, { parameters });

    console.log('✅ Configuración actualizada:', mostradorId);

    // Retornar una respuesta genérica de éxito (no podemos devolver el objeto actualizado fácilmente sin hacer otro SELECT)
    // El frontend probablemente usa los datos que envió para actualizar su estado local o recarga la lista.
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Configuración actualizada exitosamente',
        config: { mostradorId, ...body, updatedAt: new Date().toISOString() } // Mock de respuesta
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
