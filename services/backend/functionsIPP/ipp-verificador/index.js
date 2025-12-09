const { executeQuery } = require('../../shared/databricks');

/**
 * IPP VERIFICADOR - Validar mostradores contra configuración Databricks
 * 
 * Modos de operación:
 * 1. MANUAL (desde Frontend): Recibe lista específica de mostradores
 * 2. AUTOMÁTICO (desde EventBridge/Cron): Procesa TODOS los mostradores activos
 * 
 * Endpoint: POST /ipp/validate-clients
 * Body (manual): { "mostradores": ["7051602", "7051603"] }
 * Body (auto): {} o sin body
 */

// Helper para CORS dinámico
const getCorsHeaders = (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '*');
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
};

/**
 * Obtener todos los mostradores activos desde Databricks
 */
const getAllActiveMostradores = async () => {
  console.log('[IPP-VERIFICADOR] Obteniendo todos los mostradores activos...');
  
  const query = `
    SELECT DISTINCT mostrador 
    FROM invenadro.bronze.invenadro_input_automatizacion
    WHERE mostrador IS NOT NULL
    ORDER BY mostrador
  `;
  
  const result = await executeQuery(query);
  const columns = result.manifest.schema.columns.map(c => c.name);
  const rows = result.result.data_array || [];
  
  const mostradores = rows.map(row => {
    const mostrador = row[0]; // Primera columna
    return String(mostrador);
  });
  
  console.log(`[IPP-VERIFICADOR] ${mostradores.length} mostradores activos encontrados`);
  return mostradores;
};

/**
 * Validar lista de mostradores contra Databricks
 */
const validateMostradores = async (mostradorIds) => {
  console.log(`[IPP-VERIFICADOR] Validando ${mostradorIds.length} mostradores...`);
  
  // Construir query con IN para mejor performance
  const mostradorList = mostradorIds.map(id => Number(id)).join(',');
  
  const query = `
    SELECT mostrador 
    FROM invenadro.bronze.invenadro_input_automatizacion
    WHERE mostrador IN (${mostradorList})
  `;
  
  const result = await executeQuery(query);
  const columns = result.manifest.schema.columns.map(c => c.name);
  const rows = result.result.data_array || [];
  
  // Mostradores encontrados en DB
  const foundMostradores = rows.map(row => String(row[0]));
  
  // Separar válidos e inválidos
  const validMostradores = mostradorIds.filter(id => foundMostradores.includes(String(id)));
  const invalidMostradores = mostradorIds.filter(id => !foundMostradores.includes(String(id)));
  
  console.log(`[IPP-VERIFICADOR] Válidos: ${validMostradores.length}, Inválidos: ${invalidMostradores.length}`);
  
  return { validMostradores, invalidMostradores };
};

exports.handler = async (event) => {
  console.log('[IPP-VERIFICADOR] Evento recibido:', JSON.stringify(event, null, 2));
  
  const corsHeaders = getCorsHeaders(event);
  
  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  try {
    // 🔍 DETECTAR MODO: Manual o Automático
    let mostradoresToValidate = [];
    let isAutomaticMode = false;
    
    // Parsear body
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Modo Manual: Frontend envía lista de mostradores/clientes
    if (body.mostradores && Array.isArray(body.mostradores) && body.mostradores.length > 0) {
      mostradoresToValidate = body.mostradores.map(m => String(m).trim());
      isAutomaticMode = false;
      console.log(`[IPP-VERIFICADOR] MODO MANUAL: ${mostradoresToValidate.length} mostradores recibidos`);
    } 
    // Compatibilidad: Aceptar "clients" desde frontend (alias de mostradores)
    else if (body.clients && Array.isArray(body.clients) && body.clients.length > 0) {
      mostradoresToValidate = body.clients.map(m => String(m).trim());
      isAutomaticMode = false;
      console.log(`[IPP-VERIFICADOR] MODO MANUAL: ${mostradoresToValidate.length} clientes recibidos (alias)`);
    }
    // Modo Automático: EventBridge/Cron → procesar todos los activos
    else {
      mostradoresToValidate = await getAllActiveMostradores();
      isAutomaticMode = true;
      console.log(`[IPP-VERIFICADOR] MODO AUTOMÁTICO: ${mostradoresToValidate.length} mostradores activos`);
    }
    
    // Si no hay mostradores para procesar
    if (mostradoresToValidate.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'No se proporcionaron mostradores para validar',
          message: 'Envía una lista de mostradores en el body como: { "mostradores": ["7051602", "7051603"] }'
        })
      };
    }
    
    // Validar mostradores contra Databricks
    const { validMostradores, invalidMostradores } = await validateMostradores(mostradoresToValidate);
    
    // Determinar status
    let status;
    let message;
    
    if (invalidMostradores.length === 0) {
      status = 'all_valid';
      message = `Todos los ${validMostradores.length} mostradores tienen configuración`;
    } else if (validMostradores.length === 0) {
      status = 'all_invalid';
      message = `Ninguno de los ${invalidMostradores.length} mostradores tiene configuración`;
    } else {
      status = 'partial_valid';
      message = `${validMostradores.length} de ${mostradoresToValidate.length} mostradores tienen configuración`;
    }
    
    // Logs estructurados para CloudWatch
    console.log(JSON.stringify({
      level: 'INFO',
      action: 'validate_mostradores',
      mode: isAutomaticMode ? 'automatic' : 'manual',
      total: mostradoresToValidate.length,
      valid: validMostradores.length,
      invalid: invalidMostradores.length,
      status: status,
      timestamp: new Date().toISOString()
    }));
    
    // Respuesta
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status,
        message,
        mode: isAutomaticMode ? 'automatic' : 'manual',
        validClients: validMostradores,        // Frontend espera "validClients"
        invalidClients: invalidMostradores,    // Frontend espera "invalidClients"
        validMostradores,                       // Alias para claridad
        invalidMostradores,                     // Alias para claridad
        total: mostradoresToValidate.length,
        validated: validMostradores.length,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('[IPP-VERIFICADOR] ❌ Error:', error);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Error interno al validar mostradores',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

