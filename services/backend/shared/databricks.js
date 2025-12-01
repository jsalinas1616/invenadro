const axios = require('axios');

/**
 * SERVICIO DE CONEXIÓN A DATABRICKS (COMPARTIDO)
 * 
 * Maneja la conexión y operaciones con Databricks de forma genérica.
 * Incluye autenticación, ejecución de queries y manejo de errores.
 */

// Variables de configuración globales
let workspaceUrl, accessToken, warehouseId, orgId, enabled;
let configValidated = false; // Flag para validar solo una vez

/**
 * Valida que todas las variables de entorno necesarias estén configuradas
 * LAZY INITIALIZATION: Se llama la primera vez que se usa, no al importar
 */
const validateConfig = () => {
  // Si ya se validó, no hacerlo de nuevo
  if (configValidated) {
    return;
  }
  
  workspaceUrl = process.env.DATABRICKS_WORKSPACE_URL;
  accessToken = process.env.DATABRICKS_ACCESS_TOKEN;
  warehouseId = process.env.DATABRICKS_WAREHOUSE_ID;
  orgId = process.env.DATABRICKS_ORG_ID;
  
  const requiredVars = {
    'DATABRICKS_WORKSPACE_URL': workspaceUrl,
    'DATABRICKS_ACCESS_TOKEN': accessToken,
    'DATABRICKS_WAREHOUSE_ID': warehouseId,
    'DATABRICKS_ORG_ID': orgId
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.warn(`Variables de Databricks faltantes: ${missingVars.join(', ')}`);
    console.warn('El servicio de Databricks estará deshabilitado');
    enabled = false;
  } else {
    enabled = true;
    console.log('Servicio de Databricks configurado correctamente');
  }
  
  configValidated = true;
};

/**
 * Ejecuta una query SQL en Databricks
 * @param {string} query - Query SQL a ejecutar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Resultado de la query
 */
const executeQuery = async (query, options = {}) => {
    // Validar configuración la primera vez que se usa (lazy initialization)
    validateConfig();
    
    if (!enabled) {
      throw new Error('Servicio de Databricks no está configurado o faltan variables de entorno');
    }
  
    try {
      console.log(`[DATABRICKS] Ejecutando query en ${workspaceUrl}`);
      
      const response = await axios.post(
      `${workspaceUrl}/api/2.0/sql/statements`,
      {
        statement: query,
        warehouse_id: warehouseId,
        ...options
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos timeout
      }
    );

    return response.data;
    } catch (error) {
      console.error(`[DATABRICKS] Error ejecutando query:`, error.message);
      if (error.response) {
        console.error('[DATABRICKS] Detalles del error:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Error en Databricks: ${error.message}`);
    }
  };

/**
 * Verifica la conectividad con Databricks
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
const testConnection = async () => {
  if (!enabled) {
    // Intentar validar de nuevo por si las variables se cargaron tarde
    validateConfig();
    if (!enabled) return false;
  }

  try {
    const query = 'SELECT 1 as test';
    await executeQuery(query);
    return true;
  } catch (error) {
    console.error('[DATABRICKS] Error de conexión:', error.message);
    return false;
  }
};

module.exports = {
  executeQuery,
  testConnection,
  enabled: () => enabled
};

