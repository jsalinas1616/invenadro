const axios = require('axios');

/**
 * SERVICIO DE CONEXIÓN A DATABRICKS
 * 
 * Maneja la conexión y operaciones con Databricks para el proyecto de factor de redondeo.
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
      throw new Error('Servicio de Databricks no está configurado');
    }
  
    try {
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
      throw new Error(`Error en Databricks: ${error.message}`);
    }
  };

/**
 * Obtiene datos de inventario desde Databricks
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} Datos de inventario
 */
const getTrimSellout = async (filters = {}) => {
  try {
    const {mostrador, material} = filters;

    // Validar parámetros
    if (!mostrador || !material) {
      throw new Error('mostrador y material son requeridos');
    }

    // Validar que sean números válidos
    if (!/^\d+$/.test(mostrador.toString()) || !/^\d+$/.test(material.toString())) {
      throw new Error('mostrador y material deben ser números válidos');
    }

    // Quitar ceros a la izquierda usando parseInt
    const mostradorLimpio = Number(mostrador.toString()).toString();
    const materialLimpio = Number(material.toString()).toString();

    // Query de diagnóstico para ver qué datos existen
    let query = `
      SELECT  (QUANTITY) as cantidad
      FROM farmatodo.bronze.bw_sellout_trim_movil
      WHERE CUSTOMER = :CUSTOMER
      AND EANUPC = :EANUPC
    `;

    // Opciones con parámetros preparados
    const options = {
      parameters: [
        { name: 'CUSTOMER', value: Number(mostradorLimpio), type: 'LONG' },
        { name: 'EANUPC', value: Number(materialLimpio), type: 'LONG' }
      ]
    };

    const result = await executeQuery(query, options);

    // Extraer solo el valor de la suma
    const valorSuma = result.result?.data_array?.[0]?.[0];
      
    return valorSuma;
    
  } catch (error) {
    console.error('[DATABRICKS] Error en getTrimSellout:', error.message);
    throw new Error(`Error obteniendo datos de sellout: ${error.message}`);
  }
};

/**
 * Obtiene datos de sellout anual desde Databricks
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} Datos de sellout anual
 */
const getAnualSellOut = async (filters = {}) => {
  try {
    const {mostrador, material} = filters;

    // Validar parámetros
    if (!mostrador || !material) {
      throw new Error('mostrador y material son requeridos');
    }

    // Validar que sean números válidos
    if (!/^\d+$/.test(mostrador.toString()) || !/^\d+$/.test(material.toString())) {
      throw new Error('mostrador y material deben ser números válidos');
    }

    // Quitar ceros a la izquierda usando parseInt
    const mostradorLimpio = Number(mostrador.toString()).toString();
    const materialLimpio = Number(material.toString()).toString();

    // Query para datos anuales
    let query = `
      SELECT QUANTITY as cantidad
      FROM farmatodo.bronze.bw_sellout_anual_movil
      WHERE CUSTOMER = :CUSTOMER
      AND EANUPC = :EANUPC
    `;

    // Opciones con parámetros preparados
    const options = {
      parameters: [
        { name: 'CUSTOMER', value: Number(mostradorLimpio), type: 'LONG' },
        { name: 'EANUPC', value: Number(materialLimpio), type: 'LONG' }
      ]
    };

    const result = await executeQuery(query, options);

    // Extraer solo el valor de la suma
    const valorSuma = result.result?.data_array?.[0]?.[0];
      
    return valorSuma;
    
  } catch (error) {
    console.error('[DATABRICKS] Error en getAnualSellOut:', error.message);
    throw new Error(`Error obteniendo datos de sellout anual: ${error.message}`);
  }
};

/**
 * Verifica la conectividad con Databricks
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
const testConnection = async () => {
  if (!enabled) {
    return false;
  }

  try {
    const query = 'SELECT 1 as test';
    
    const result = await executeQuery(query);
    return true;
  } catch (error) {
    console.error('[DATABRICKS] Error de conexión:', error.message);
            console.error('[DATABRICKS] Error completo:', error);
    return false;
  }
};

/**
 * Obtiene datos de ventas (trim y anual) para múltiples EANs en una sola consulta
 * @param {Array} eanList - Lista de códigos EAN/UPC
 * @returns {Promise<Array>} Datos de ventas agrupados por EAN y customer
 */
const getVentasBulk = async (eanList, mostrador) => {
  try {
    if (!eanList || !Array.isArray(eanList) || eanList.length === 0) {
      throw new Error('eanList debe ser un array no vacío');
    }

    // Limpiar y validar EANs - FORMATEAR A 18 DÍGITOS
    const eansLimpios = eanList
      .map(ean => {
        const numero = Number(ean.toString()).toString();
        return numero.padStart(18, '0');  // ← CRÍTICO: Formatear a 18 dígitos con ceros
      })
      .filter(ean => /^\d{18}$/.test(ean));  // ← Validar que sean 18 dígitos

    if (eansLimpios.length === 0) {
      throw new Error('No se encontraron EANs válidos');
    }

    console.log(`[DATABRICKS] Consultando ventas bulk para ${eansLimpios.length} EANs`);
    console.log(`[DATABRICKS] DEBUG - Mostrador recibido: "${mostrador}" (tipo: ${typeof mostrador})`);

    // NORMALIZAR MOSTRADOR: Agregar ceros a la izquierda para que coincida con Databricks
    const mostradorNormalizado = mostrador.toString().padStart(10, '0');
    console.log(`[DATABRICKS] DEBUG - Mostrador normalizado: ${mostradorNormalizado}`);

    // Crear lista de EANs para el IN clause (ya formateados a 18 dígitos)
    // IMPORTANTE: Deben ir con comillas simples porque son strings en Databricks
    const eanListString = eansLimpios.map(ean => `'${ean}'`).join(',');
    
    console.log(`[DATABRICKS] DEBUG - Primeros 5 EANs: ${eansLimpios.slice(0, 5).join(', ')}`);
    console.log(`[DATABRICKS] DEBUG - Query customer value: ${mostradorNormalizado}`);

    // Query optimizado que combina trim y anual en una sola consulta
    // IMPORTANTE: La columna se llama "material" en Databricks, NO "eanupc"
    const query = `
      SELECT 
        material as eanupc,
        customer,
        SUM(CASE WHEN source = 'trim' THEN quantity ELSE 0 END) as ventas_trim,
        SUM(CASE WHEN source = 'anual' THEN quantity ELSE 0 END) as ventas_anual
      FROM (
        SELECT material, customer, quantity, 'trim' as source
        FROM farmatodo.bronze.bw_sellout_trim_movil
        WHERE material IN (${eanListString})
        AND customer = ${mostradorNormalizado}
        
        UNION ALL
        
        SELECT material, customer, quantity, 'anual' as source  
        FROM farmatodo.bronze.bw_sellout_anual_movil
        WHERE material IN (${eanListString})      
        AND customer = ${mostradorNormalizado}
      )
      GROUP BY material, customer
    `;

    console.log(`[DATABRICKS] EJECUTANDO QUERY...`);
    console.log(query);
    
    const result = await executeQuery(query);

    // Procesar resultados
    const datos = result.result?.data_array || [];
    
    if (datos.length === 0) {
      console.log(`[DATABRICKS] ❌ NO SE ENCONTRARON DATOS - Revisando query...`);
      console.log(`[DATABRICKS] ❌ Customer buscado: '${mostradorNormalizado}'`);
      console.log(`[DATABRICKS] ❌ Total EANs buscados: ${eansLimpios.length}`);
      console.log(`[DATABRICKS] ❌ Primeros EANs: ${eansLimpios.slice(0, 3).join(', ')}`);
    } else {
      console.log(`[DATABRICKS] ✅ DATOS ENCONTRADOS: ${datos.length} registros`);
      console.log(`[DATABRICKS] ✅ Ejemplo: ${JSON.stringify(datos[0])}`);
    }
    
    console.log(`[DATABRICKS] Bulk query completado: ${datos.length} registros obtenidos`);

    // Transformar a formato más manejable
    return datos.map(row => ({
      eanupc: row[0]?.toString(),
      customer: row[1]?.toString(), 
      ventas_trim: Number(row[2]) || 0,
      ventas_anual: Number(row[3]) || 0
    }));
    
  } catch (error) {
    console.error('[DATABRICKS] Error en getVentasBulk:', error.message);
    throw new Error(`Error obteniendo datos bulk de ventas: ${error.message}`);
  }
};

const getControlados = async (filters = {}) => {
  try {
    const {material} = filters;

    // Validar parámetros
    if (!material) {
      throw new Error('mostrador es requerido');
    }

    // Validar que sean números válidos
    if (!/^\d+$/.test(material.toString())) {
      throw new Error('material debe ser un número válido');
    }

    // Quitar ceros a la izquierda usando parseInt
    const materialLimpio = Number(material.toString()).toString();

    // Query para datos de controlados
    let query = `
      SELECT DISTINCT(:MATERIAL),* FROM invenadro.bronze.input_redondeo

    `;

    // Opciones con parámetros preparados
    const options = {
      parameters: [
        { name: 'MATERIAL', value: Number(materialLimpio), type: 'LONG' }
      ]
    };

    const result = await executeQuery(query, options);

    console.log('[DATABRICKS] Resultado de la consulta controlados:', result.result?.data_array);

    return result.result?.data_array;
    
  } catch (error) {
    console.error('[DATABRICKS] Error obteniendo datos de controlados:', error);
    throw new Error(`Error obteniendo datos de controlados: ${error.message}`);
  }
};

// NO inicializar aquí - se usa lazy initialization en executeQuery()
// validateConfig() se llama la primera vez que se ejecuta executeQuery()

// Exportar funciones
module.exports = {
  executeQuery,
  getTrimSellout,
  getAnualSellOut,
  getVentasBulk,
  testConnection,
  getControlados,
  enabled: () => enabled,
}; 