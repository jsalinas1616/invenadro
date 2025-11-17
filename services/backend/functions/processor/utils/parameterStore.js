const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'mx-central-1' });

// Cache en memoria para evitar múltiples llamadas a Parameter Store
let databricksConfig = null;

/**
 * Carga las credenciales de Databricks desde AWS Parameter Store
 * Usa cache en memoria para evitar llamadas repetidas
 * @returns {Promise<Object>} Configuración de Databricks
 */
async function getDatabricksConfig() {
  // Si ya está en cache, retornar
  if (databricksConfig) {
    return databricksConfig;
  }

  try {
    console.log('[PARAMETER STORE] Cargando credenciales de Databricks...');

    const command = new GetParametersCommand({
      Names: [
        '/invenadro/databricks/workspace-url',
        '/invenadro/databricks/access-token',
        '/invenadro/databricks/warehouse-id',
        '/invenadro/databricks/org-id'
      ],
      WithDecryption: true // Importante: descifrar el access-token (SecureString)
    });

    const response = await ssmClient.send(command);

    if (!response.Parameters || response.Parameters.length === 0) {
      throw new Error('No se pudieron cargar los parámetros de Databricks desde Parameter Store');
    }

    // Convertir array a objeto
    const params = {};
    response.Parameters.forEach(param => {
      const key = param.Name.split('/').pop(); // Extraer ultima parte del nombre
      params[key] = param.Value;
    });

    // Validar que todos los parámetros existen
    const required = ['workspace-url', 'access-token', 'warehouse-id', 'org-id'];
    const missing = required.filter(key => !params[key]);
    
    if (missing.length > 0) {
      throw new Error(`Faltan parámetros de Databricks: ${missing.join(', ')}`);
    }

    // Guardar en cache
    databricksConfig = {
      DATABRICKS_WORKSPACE_URL: params['workspace-url'],
      DATABRICKS_ACCESS_TOKEN: params['access-token'],
      DATABRICKS_WAREHOUSE_ID: params['warehouse-id'],
      DATABRICKS_ORG_ID: params['org-id']
    };

    console.log('[PARAMETER STORE] Credenciales de Databricks cargadas exitosamente');
    console.log('[PARAMETER STORE] Workspace:', databricksConfig.DATABRICKS_WORKSPACE_URL);
    
    return databricksConfig;

  } catch (error) {
    console.error('[PARAMETER STORE] Error cargando configuración de Databricks:', error.message);
    throw error;
  }
}

/**
 * Inyecta las credenciales de Databricks en process.env
 * Llamar al inicio de la Lambda antes de usar databricksService
 */
async function initializeDatabricks() {
  const config = await getDatabricksConfig();
  
  // Inyectar en process.env para que databricksService las detecte
  process.env.DATABRICKS_WORKSPACE_URL = config.DATABRICKS_WORKSPACE_URL;
  process.env.DATABRICKS_ACCESS_TOKEN = config.DATABRICKS_ACCESS_TOKEN;
  process.env.DATABRICKS_WAREHOUSE_ID = config.DATABRICKS_WAREHOUSE_ID;
  process.env.DATABRICKS_ORG_ID = config.DATABRICKS_ORG_ID;
  
  console.log('[DATABRICKS] Variables de entorno inicializadas desde Parameter Store');
}

module.exports = {
  getDatabricksConfig,
  initializeDatabricks
};

