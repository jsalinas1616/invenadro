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
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };
};

// Mapper de fila SQL a objeto de configuración del frontend
const mapRowToConfig = (row) => {
  // Helper para convertir booleanos de Databricks a formato frontend
  // Databricks devuelve true/false, frontend espera 'S'/'N'
  const toFrontendBool = (val) => {
    // Manejar null, undefined, o cualquier valor falsy
    if (val === true || val === 'true' || val === 'S' || val === 1) {
      return 'S';
    }
    return 'N';
  };
  
  return {
    mostradorId: row.mostrador ? row.mostrador.toString() : null, // ID para el frontend
    mostrador: row.mostrador,
    tipoInvenadro: row.tipo_inventario,
    montoRequerido: row.monto_deseado,
    
    // Campos booleanos mapeados
    incluye_Refrigerados: toFrontendBool(row.incluye_refrigerados),
    incluye_Psicotropicos: toFrontendBool(row.incluye_psicotropicos),
    incluye_Especialidades: toFrontendBool(row.incluye_especialidades),
    incluye_Genericos: toFrontendBool(row.incluye_genericos),
    incluye_Dispositivos_Medicos: toFrontendBool(row.incluye_dispositivos_medicos),
    incluye_Complementos_Alimenticios: toFrontendBool(row.incluye_complementos_alimenticios),
    incluye_Dermatologico: toFrontendBool(row.incluye_dermatologico),
    incluye_OTC: toFrontendBool(row.incluye_otc),
    incluye_Etico_Patente: toFrontendBool(row.incluye_etico_patente),
    
    updatedAt: row.fecha_actualizacion
  };
};

exports.handler = async (event) => {
  console.log('READ Config (Databricks) - Evento recibido:', JSON.stringify(event, null, 2));

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

    if (mostradorId) {
      // BUSCAR POR ID (mostrador)
      console.log('Buscando configuración para mostrador:', mostradorId);
      
      const query = `
        SELECT * 
        FROM invenadro.bronze.invenadro_input_automatizacion
        WHERE mostrador = :mostrador
      `;
      
      const parameters = [
        { name: 'mostrador', value: Number(mostradorId), type: 'LONG' }
      ];

      const result = await executeQuery(query, { parameters });
      
      // En Databricks SQL API, los resultados vienen en result.result.data_array (array de arrays) 
      // O en result.manifest.schema.columns (nombres)
      // PERO axios devuelve response.data.
      // executeQuery devuelve response.data
      
      // La estructura de respuesta de executeQuery (que viene de la API de Databricks) es compleja.
      // Normalmente tiene: result: { data_array: [...], schema: {...} }
      
      // IMPORTANTE: Databricks SQL Statement API devuelve filas como arrays, no objetos.
      // Necesitamos mapear columnas a nombres si queremos usar nombres.
      // O confiar en el orden. El SELECT * no garantiza orden.
      // Mejor especificar columnas explícitamente o mapear dinámicamente.
      
      // Vamos a hacer un SELECT explícito para asegurar el orden y mapeo
      // O mejor, usar un helper que transforme el resultado de Databricks a objetos.
      
      // Vamos a simplificar y asumir que executeQuery devuelve el raw response.
      // Necesito procesar result para convertirlo a objetos.
      
      const columns = result.manifest.schema.columns.map(c => c.name);
      const rows = result.result.data_array || [];
      
      if (rows.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Configuración no encontrada' })
        };
      }
      
      // Convertir array de valores a objeto usando nombres de columnas
      const rowData = {};
      rows[0].forEach((val, idx) => {
        rowData[columns[idx]] = val;
      });
      
      const config = mapRowToConfig(rowData);

      console.log('✅ Configuración encontrada:', config.mostrador);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ config })
      };

    } else {
      // LISTAR TODAS
      console.log('Listando todas las configuraciones...');
      
      const query = `SELECT * FROM invenadro.bronze.invenadro_input_automatizacion`;
      const result = await executeQuery(query);
      
      const columns = result.manifest.schema.columns.map(c => c.name);
      const rows = result.result.data_array || [];
      
      const configs = rows.map(row => {
        const rowData = {};
        row.forEach((val, idx) => {
          rowData[columns[idx]] = val;
        });
        return mapRowToConfig(rowData);
      });

      console.log(`✅ ${configs.length} configuraciones encontradas`);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          configs,
          count: configs.length
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
