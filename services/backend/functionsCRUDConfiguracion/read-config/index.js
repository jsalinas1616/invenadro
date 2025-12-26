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
    
    // Parámetros de paginación y filtros desde query string
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page) || 1;
    const pageSize = parseInt(queryParams.pageSize) || 50;
    const searchTerm = queryParams.search || '';
    const tipoFilter = queryParams.tipo || '';
    
    const offset = (page - 1) * pageSize;

    if (mostradorId) {
      // BUSCAR POR ID (mostrador) - sin cambios
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
      // LISTAR TODAS CON PAGINACIÓN Y FILTROS
      console.log(`Listando configuraciones - Página: ${page}, Tamaño: ${pageSize}, Búsqueda: ${searchTerm}, Tipo: ${tipoFilter}`);
      
      // Construir condiciones WHERE dinámicamente
      let whereConditions = [];
      let parameters = [];
      
      if (searchTerm) {
        whereConditions.push('(CAST(mostrador AS STRING) LIKE :search)');
        parameters.push({ 
          name: 'search', 
          value: `%${searchTerm}%`, 
          type: 'STRING' 
        });
      }
      
      if (tipoFilter && tipoFilter !== 'all') {
        whereConditions.push('tipo_inventario = :tipo');
        parameters.push({ 
          name: 'tipo', 
          value: tipoFilter, 
          type: 'STRING' 
        });
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM invenadro.bronze.invenadro_input_automatizacion
        ${whereClause}
      `;
      
      // Query para obtener datos paginados
      const dataQuery = `
        SELECT * 
        FROM invenadro.bronze.invenadro_input_automatizacion
        ${whereClause}
        ORDER BY mostrador ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      
      // Ejecutar ambas queries
      const [countResult, dataResult] = await Promise.all([
        executeQuery(countQuery, parameters.length > 0 ? { parameters } : undefined),
        executeQuery(dataQuery, parameters.length > 0 ? { parameters } : undefined)
      ]);
      
      // Procesar count
      const countColumns = countResult.manifest.schema.columns.map(c => c.name);
      const countRows = countResult.result.data_array || [];
      const total = countRows[0] ? countRows[0][0] : 0;
      
      // Procesar datos
      const columns = dataResult.manifest.schema.columns.map(c => c.name);
      const rows = dataResult.result.data_array || [];
      
      const configs = rows.map(row => {
        const rowData = {};
        row.forEach((val, idx) => {
          rowData[columns[idx]] = val;
        });
        return mapRowToConfig(rowData);
      });

      const totalPages = Math.ceil(total / pageSize);

      console.log(`✅ ${configs.length} configuraciones encontradas (${total} total)`);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          configs,
          pagination: {
            page,
            pageSize,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1
          }
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
