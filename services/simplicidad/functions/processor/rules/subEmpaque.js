const axios = require('axios');

// CACHE GLOBAL para evitar llamadas repetidas al API de Nadro durante la optimización
const cacheAPI = new Map();


/**
 * REGLA 5: APLICAR SUB EMPAQUE
 * 
 * Regla especial para productos que vienen en sub empaques (terminan con " S" en descripción).
 * Estos productos usan el valor de "Óptimo Premium" multiplicado por el factor de empaque
 * obtenido del API de Nadro.
 * 
 * Condiciones para aplicar:
 * - Descripción del material debe terminar con " S" (con espacios opcionales)
 * - Debe existir columna "Óptimo Premium" con valor válido
 * - Se consulta el API de Nadro para obtener el factor de empaque (APIMUN)
 * 
 * @param {Array} datos - Array con datos procesados
 * @returns {Array} Datos con campos 'sub empaque' y 'sub empaque aplicado'
 */
const aplicarSubEmpaque = async (datos) => {
  console.log(`[SUB EMPAQUE] DEBUG INICIANDO - Total productos: ${datos.length}`);
  console.log(`[SUB EMPAQUE] DEBUG VERSION: 2025-08-08T02:47:00.000Z`);
  
  try {
    // Función auxiliar para consultar el API de Nadro CON CACHE
    const consultarAPIMaterial = async (material) => {
      // VERIFICAR CACHE PRIMERO
      if (cacheAPI.has(material)) {
        const datosCache = cacheAPI.get(material);
        return datosCache;
      }

      try {
        const url = `https://api.nadro.mx/prod/servicios/general/ZCDS_MAT_DELTA_X_FCH_CDS/ZCDS_MAT_DELTA_x_FCH(p_dias=-500)/Set?%24filter=(APIMAT%20eq%20%27${material}%27)&%24format=json&sap-client=500&api-key=6641f95654734e46b4972758fd79ef56`;
        
        const response = await axios.get(url, {
          headers: {
            'Cookie': 'ApplicationGatewayAffinity=e270adc7c12c4b5c2b9e6a74cd521cac; ApplicationGatewayAffinityCORS=e270adc7c12c4b5c2b9e6a74cd521cac; sap-usercontext=sap-client=500'
          }
        });
        
        let resultado = { apimun: 9999999999, apiume: 'error!!!' }; // Valor por defecto
        
        if (response.status === 200) {
          const data = response.data;
          
          if (data.d && data.d.results && data.d.results.length > 0) {
            resultado.apimun = parseFloat(data.d.results[0].APIMUN) || 1;
            resultado.apiume = (data.d.results[0].APIUME).toString() || 'pz';
          }
        }
        
        // GUARDAR EN CACHE
        cacheAPI.set(material, resultado);
        
        return resultado;
        
      } catch (error) {
        const resultadoError = { apimun: 1, apiume: 'pz' };
        
        // GUARDAR ERROR EN CACHE TAMBIÉN (para evitar reintentos)
        cacheAPI.set(material, resultadoError);
        
        return resultadoError;
      }
    };

    // OPTIMIZACIÓN: Pre-calcular claves de columnas (una sola vez)
    const descMaterialKey = Object.keys(datos[0] || {}).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      return key === 'Descripción' || // Exact match primero
             keyLower.includes('descripcion') ||
             keyLower.includes('descmaterial') || 
             keyLower.includes('descripcionmaterial');
    });
    
    // DEBUG: Verificar qué columnas existen
    console.log(`[SUB EMPAQUE] DEBUG COLUMNAS DISPONIBLES:`);
    console.log(`[SUB EMPAQUE] - Todas las columnas: ${Object.keys(datos[0] || {}).join(', ')}`);
    
    // USAR 'valor ReglaOptimoQ' que es la columna correcta después de las reglas anteriores
    const optimoPremiumKey = 'valor ReglaOptimoQ';
    
    console.log(`[SUB EMPAQUE] DEBUG COLUMNA BUSCADA:`);
    console.log(`[SUB EMPAQUE] - Buscando: "${optimoPremiumKey}"`);
    console.log(`[SUB EMPAQUE] - Existe: ${datos[0] && datos[0][optimoPremiumKey] !== undefined}`);
    
    const reglaOptimoQKey = Object.keys(datos[0] || {}).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      return keyLower.includes('valorreglaoptimoq') || 
             keyLower.includes('valor') && keyLower.includes('reglaoptimoq');
    });

    // NOTA: Las APIs ya fueron precargadas antes de la optimización
    // Ya no necesitamos consultar APIs aquí - todo está en cache

    const resultados = [];
    
    // Ahora procesar cada item (súper rápido porque APIs ya están en cache)
    for (const item of datos) {
      
      // Valor base: si aplicó ReglaOptimoQ, usar ese valor; si no, usar valor óptimo redondeado
      const valorBase = reglaOptimoQKey && item[reglaOptimoQKey] ? 
        parseFloat(item[reglaOptimoQKey]) : 
        (item['valor optimo redondeado'] ? parseFloat(item['valor optimo redondeado']) : 0);
      
      let subEmpaqueAplicado = false;
      let valorSubEmpaque = valorBase; // Por defecto, mantener valor base
      
      // VERIFICAR CONDICIONES PARA SUB EMPAQUE
      if (descMaterialKey && item[descMaterialKey]) {
        const descripcion = item[descMaterialKey].toString().trim();
        
        // Regex MEJORADO: busca códigos que terminen en S/s al final
        // Acepta: espacio + letras + S  O  números + letras + S
        // Ejemplos: "aspirina S", "aspirina GS", "medicina 33GS", "BRONCO FRESH CARA MIEL-EUCA 33GS"
        // Excluye: "medicinas", "aspirinas" (solo letras sin separador) 
        const terminaConS = /(\s+|[0-9]+)[a-zA-Z]*[sS]\s*$|[0-9]+[a-zA-Z]*[sS]\s*$/i.test(descripcion);
        
        // DEBUG: Log para productos que terminan en S o GS
        if (terminaConS) {
          console.log(`[SUB EMPAQUE] DEBUG PRODUCTO QUE TERMINA EN S:`);
          console.log(`[SUB EMPAQUE] - Descripción: "${descripcion}"`);
          console.log(`[SUB EMPAQUE] - Termina en S: ${terminaConS}`);
          console.log(`[SUB EMPAQUE] - Tiene valor ReglaOptimoQ: ${item[optimoPremiumKey] !== undefined}`);
          console.log(`[SUB EMPAQUE] - Valor ReglaOptimoQ: ${item[optimoPremiumKey]}`);
          console.log(`[SUB EMPAQUE] - Valor > 0: ${parseFloat(item[optimoPremiumKey]) > 0}`);
          console.log(`[SUB EMPAQUE] - Material: ${item.Material}`);
        }

        // CAMBIO: Usar productos que tengan valor ReglaOptimoQ > 0 (no solo undefined)
        if (terminaConS && item[optimoPremiumKey] !== undefined && parseFloat(item[optimoPremiumKey]) > 0) {

          const valorOptimoPremium = parseFloat(item[optimoPremiumKey]) || 0;
          
          // Obtener datos de API (solo desde cache, no hacer consultas nuevas)
          const material = String(item.Material || ''); // Convertir explícitamente a string para que coincida con cache
          let apimun = 1, apiume = 'PI'; // Valores por defecto
          
          if (cacheAPI.has(material)) {
            const datosCache = cacheAPI.get(material);
            apimun = datosCache.apimun;
            apiume = datosCache.apiume;
          } else {
            console.log(`[SUB EMPAQUE] WARNING Material ${material} no está en cache - usando valores por defecto`);
            
            // DEBUG específico para material 1564
            if (material === '1564' || material === 1564) {
              console.log(`[SUB EMPAQUE] DEBUG CACHE MISS PARA MATERIAL 1564:`);
              console.log(`[SUB EMPAQUE] - Material original: "${item.Material}" (tipo: ${typeof item.Material})`);
              console.log(`[SUB EMPAQUE] - Material convertido: "${material}" (tipo: ${typeof material})`);
              console.log(`[SUB EMPAQUE] - Cache actual keys: [${Array.from(cacheAPI.keys()).slice(0, 10).join(', ')}...]`);
              console.log(`[SUB EMPAQUE] - Cache size: ${cacheAPI.size}`);
              console.log(`[SUB EMPAQUE] - Cache tiene '1564': ${cacheAPI.has('1564')}`);
              console.log(`[SUB EMPAQUE] - Cache tiene 1564: ${cacheAPI.has(1564)}`);
            }
          }

          // DEBUG EXTRA para TODOS los productos que califican
          console.log(`[SUB EMPAQUE] DEBUG API PARA "${descripcion}":`);
          console.log(`[SUB EMPAQUE] - APIMUN: ${apimun}`);
          console.log(`[SUB EMPAQUE] - APIUME: "${apiume}"`);
          console.log(`[SUB EMPAQUE] - Aplicará Sub Empaque: ${apiume === 'SUB'}`);
          console.log(`[SUB EMPAQUE] - Material: ${item.Material}`);

          if (apiume === 'SUB') {
            subEmpaqueAplicado = true;
            valorSubEmpaque =  apimun;
          } else {
            valorSubEmpaque = valorOptimoPremium;
          }
        } 
      } 
      
      // Agregar resultado al array
      resultados.push({
        ...item,
        'sub empaque aplicado': subEmpaqueAplicado,
        'sub empaque': valorSubEmpaque
      });
    } // Closing brace for the for loop
    
    return resultados;
    
  } catch (error) {
    throw error;
  }
};

/**
 * Limpia el cache de API de Nadro
 * Debe llamarse al inicio de cada nueva ejecución
 */
const limpiarCacheAPI = () => {
  const tamanoAnterior = cacheAPI.size;
  cacheAPI.clear();
  console.log(`[SUB EMPAQUE CACHE] 🧹 Cache limpiado: ${tamanoAnterior} entradas eliminadas`);
  return tamanoAnterior;
};

/**
 * Consulta BULK de API Nadro - UNA SOLA LLAMADA para múltiples materiales
 * @param {Array} materiales - Array de códigos de material
 * @returns {Object} Objeto con los resultados mapeados por material
 */
const consultarAPIBulk = async (materiales, configSubEmpaque = {}) => {
  if (!materiales || materiales.length === 0) return {};
  
  // DIVIDIR EN LOTES: Evitar Error 414 (URL Too Long)
  const TAMANO_LOTE = configSubEmpaque.productsPorQuerySubEmpaque || 15; // Configurable
  const paralelismoMax = configSubEmpaque.paralelismoSubEmpaque || 10; // Configurable
  const resultadosFinales = {};
  
  try {
    console.log(`[SUB EMPAQUE] BULK API: Consultando ${materiales.length} materiales en lotes de ${TAMANO_LOTE}...`);
    
    // DIVIDIR EN LOTES Y PROCESAR EN PARALELO
    const lotes = [];
    for (let i = 0; i < materiales.length; i += TAMANO_LOTE) {
      lotes.push(materiales.slice(i, i + TAMANO_LOTE));
    }
    
    console.log(`[SUB EMPAQUE] Procesando ${lotes.length} lotes de ${TAMANO_LOTE} en PARALELO...`);
    
    // Función para procesar un lote individual
    const procesarLote = async (lote, numeroLote) => {
      console.log(`[SUB EMPAQUE] Lote ${numeroLote}/${lotes.length}: ${lote.length} materiales...`);
      
      try {
        // Crear filtro con OR para este lote
        const materialesFilter = lote.map(mat => `APIMAT eq '${mat}'`).join(' or ');
        const url = `https://api.nadro.mx/prod/servicios/general/ZCDS_MAT_DELTA_X_FCH_CDS/ZCDS_MAT_DELTA_x_FCH(p_dias=-500)/Set?%24filter=(${materialesFilter})&%24format=json&sap-client=500&api-key=6641f95654734e46b4972758fd79ef56`;
        
        const response = await axios.get(url, {
          headers: {
            'Cookie': 'ApplicationGatewayAffinity=e270adc7c12c4b5c2b9e6a74cd521cac; ApplicationGatewayAffinityCORS=e270adc7c12c4b5c2b9e6a74cd521cac; sap-usercontext=sap-client=500'
          }
        });
        
        const resultadosLote = {};
        if (response.status === 200 && response.data.d && response.data.d.results) {
          // Procesar resultados de este lote
          response.data.d.results.forEach(item => {
            const material = item.APIMAT;
            resultadosLote[material] = {
              apimun: parseFloat(item.APIMUN) || 1,
              apiume: (item.APIUME || 'pz').toString()
            };
            
            // DEBUG específico para material 1564
            if (material === '1564' || material === 1564) {
              console.log(`[SUB EMPAQUE] DEBUG MATERIAL 1564 ENCONTRADO EN API:`);
              console.log(`[SUB EMPAQUE] - APIMAT: "${item.APIMAT}" (tipo: ${typeof item.APIMAT})`);
              console.log(`[SUB EMPAQUE] - APIDES: "${item.APIDES}"`);
              console.log(`[SUB EMPAQUE] - APIUME: "${item.APIUME}"`);
              console.log(`[SUB EMPAQUE] - APIMUN: "${item.APIMUN}"`);
              console.log(`[SUB EMPAQUE] - Guardado en cache como key: "${material}" (tipo: ${typeof material})`);
            }
          });
        }
        
        console.log(`[SUB EMPAQUE] Lote ${numeroLote} completado: ${Object.keys(resultadosLote).length} materiales`);
        return resultadosLote;
        
      } catch (errorLote) {
        console.error(`[SUB EMPAQUE] ERROR en lote ${numeroLote}:`, errorLote.message);
        return {}; // Retornar objeto vacío en caso de error
      }
    };
    
    // EJECUTAR LOTES CON PARALELISMO LIMITADO
    console.log(`[SUB EMPAQUE] Procesando ${lotes.length} lotes con paralelismo máximo de ${paralelismoMax}...`);
    
    const resultadosLotes = [];
    
    // Procesar en lotes de paralelismo limitado
    for (let i = 0; i < lotes.length; i += paralelismoMax) {
      const loteParalelo = lotes.slice(i, i + paralelismoMax);
      console.log(`[SUB EMPAQUE] Procesando grupo ${Math.floor(i/paralelismoMax) + 1}: lotes ${i + 1}-${Math.min(i + paralelismoMax, lotes.length)} (${loteParalelo.length} lotes simultáneos)...`);
      
      const promesasGrupo = loteParalelo.map((lote, index) => procesarLote(lote, i + index + 1));
      const resultadosGrupo = await Promise.all(promesasGrupo);
      resultadosLotes.push(...resultadosGrupo);
    }
    
    // Combinar todos los resultados
    resultadosLotes.forEach(resultadoLote => {
      Object.assign(resultadosFinales, resultadoLote);
    });
    
    console.log(`[SUB EMPAQUE] BULK API completado: ${Object.keys(resultadosFinales).length} materiales obtenidos`);
    
    // Llenar cache con resultados bulk
    Object.entries(resultadosFinales).forEach(([material, datos]) => {
      cacheAPI.set(material, datos);
    });
    
    // Para materiales no encontrados, agregar valores por defecto
    materiales.forEach(material => {
      if (!resultadosFinales[material]) {
        const valorDefecto = { apimun: 9999999999, apiume: 'error!!!' };
        resultadosFinales[material] = valorDefecto;
        cacheAPI.set(material, valorDefecto);
      }
    });
    
    const totalLotes = Math.ceil(materiales.length / TAMANO_LOTE);
    console.log(`[SUB EMPAQUE] Mejora de rendimiento: ${totalLotes} llamadas PARALELAS vs ${materiales.length} llamadas individuales`);
    
    return resultadosFinales;
    
  } catch (error) {
    console.error(`[SUB EMPAQUE] ERROR en BULK API:`, error.message);
    
    // En caso de error, llenar con valores por defecto
    const resultadosError = {};
    materiales.forEach(material => {
      const valorDefecto = { apimun: 9999999999, apiume: 'error!!!' };
      resultadosError[material] = valorDefecto;
      cacheAPI.set(material, valorDefecto);
    });
    
    return resultadosError;
  }
};

/**
 * PRECARGA TODAS LAS APIS DE SUB EMPAQUE DE UNA VEZ
 * 
 * Esta función identifica todos los materiales que necesitarán consulta API
 * y los precarga en paralelo ANTES de la optimización de factores.
 * 
 * @param {Array} datos - Dataset completo
 * @returns {Promise} Promesa que se resuelve cuando todas las APIs están cargadas
 */
const precargarAPIsSubEmpaque = async (datos, configSubEmpaque = {}) => {
  try {
    console.log(`[SUB EMPAQUE] Iniciando precarga de APIs...`);
    
    // Función auxiliar para consultar el API (misma que la interna)
    const consultarAPIMaterial = async (material) => {
      if (cacheAPI.has(material)) {
        return cacheAPI.get(material);
      }
      
      try {
        const url = `https://api.nadro.mx/prod/servicios/general/ZCDS_MAT_DELTA_X_FCH_CDS/ZCDS_MAT_DELTA_x_FCH(p_dias=-500)/Set?%24filter=(APIMAT%20eq%20%27${material}%27)&%24format=json&sap-client=500&api-key=6641f95654734e46b4972758fd79ef56`;
        
        const response = await axios.get(url, {
          headers: {
            'Cookie': 'ApplicationGatewayAffinity=e270adc7c12c4b5c2b9e6a74cd521cac; ApplicationGatewayAffinityCORS=e270adc7c12c4b5c2b9e6a74cd521cac; sap-usercontext=sap-client=500'
          }
        });
        
        let resultado = { apimun: 9999999999, apiume: 'error!!!' };
        
        if (response.status === 200) {
          const data = response.data;
          if (data.d && data.d.results && data.d.results.length > 0) {
            resultado.apimun = parseFloat(data.d.results[0].APIMUN) || 1;
            resultado.apiume = (data.d.results[0].APIUME).toString() || 'pz';
          }
        }
        
        cacheAPI.set(material, resultado);
        return resultado;
        
      } catch (error) {
        const resultadoError = { apimun: 1, apiume: 'pz' };
        cacheAPI.set(material, resultadoError);
        return resultadoError;
      }
    };
    
    // Identificar columnas necesarias
    const descMaterialKey = Object.keys(datos[0] || {}).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      return key === 'Descripción' || // Exact match primero
             keyLower.includes('descripcion') ||
             keyLower.includes('descmaterial') || 
             keyLower.includes('descripcionmaterial');
    });
    
    // PRECACHE: Solo necesitamos encontrar productos que terminan en S
    // No necesitamos ninguna columna de valores, solo la descripción

    // Identificar TODOS los materiales que necesitarán consulta API
    const materialesParaConsultar = new Set();
    
    console.log(`[SUB EMPAQUE] PRECACHE DEBUG: Revisando ${datos.length} productos...`);
    console.log(`[SUB EMPAQUE] PRECACHE DEBUG: descMaterialKey encontrado: ${descMaterialKey}`);
    
    let productosRevisados = 0;
    let productosTerminanS = 0;
    
    for (const item of datos) {
      productosRevisados++;
      
      if (descMaterialKey && item[descMaterialKey]) {
        const descripcion = item[descMaterialKey].toString().trim();
        const material = String(item.Material || '');
        
        // IMPRIMIR TODAS LAS DESCRIPCIONES
        console.log(`[precacheSubEmpaque] Producto ${productosRevisados}: "${descripcion}" (Material: ${material})`);
        
        const terminaConS = /(\s+|[0-9]+)[a-zA-Z]*[sS]\s*$/i.test(descripcion);
        
        if (terminaConS) {
          productosTerminanS++;
          
          console.log(`[precacheSubEmpaque] TERMINA EN S #${productosTerminanS}: "${descripcion}" (Material: ${material})`);
          
          if (material && !cacheAPI.has(material)) {
            materialesParaConsultar.add(material);
            console.log(`[precacheSubEmpaque] Material ${material} agregado para consultar`);
          } else if (cacheAPI.has(material)) {
            console.log(`[precacheSubEmpaque] Material ${material} ya está en cache`);
          }
        }
      } else {
        console.log(`[precacheSubEmpaque] ERROR Producto ${productosRevisados}: Sin descripción válida (descMaterialKey: ${descMaterialKey})`);
      }
    }
    
    console.log(`[SUB EMPAQUE] PRECACHE RESUMEN:`);
    console.log(`[SUB EMPAQUE] - Productos revisados: ${productosRevisados}`);
    console.log(`[SUB EMPAQUE] - Productos que terminan en S: ${productosTerminanS}`);
    console.log(`[SUB EMPAQUE] - Materiales nuevos para consultar: ${materialesParaConsultar.size}`);
    console.log(`[SUB EMPAQUE] - Cache actual tamaño: ${cacheAPI.size}`);
    
    // HACER UNA SOLA CONSULTA BULK para todos los materiales
    if (materialesParaConsultar.size > 0) {
      console.log(`[SUB EMPAQUE] BULK API: Consultando ${materialesParaConsultar.size} materiales...`);
      console.log(`[SUB EMPAQUE] USANDO CONFIGURACIÓN: lotes de ${configSubEmpaque.productsPorQuerySubEmpaque || 1}, paralelismo ${configSubEmpaque.paralelismoSubEmpaque || 10}`);
      
      const materialesArray = Array.from(materialesParaConsultar);
      await consultarAPIBulk(materialesArray, configSubEmpaque);
      
      console.log(`[SUB EMPAQUE] BULK Precarga completada: ${materialesParaConsultar.size} materiales en cache`);
      console.log(`[SUB EMPAQUE] Cache final contiene ${cacheAPI.size} materiales total`);
    } else {
      console.log(`[SUB EMPAQUE] No hay materiales nuevos para consultar (todo en cache)`);
    }
    
  } catch (error) {
    console.warn(`[SUB EMPAQUE] Error en precarga de APIs: ${error.message}`);
    // No hacer throw - el sistema puede continuar sin las APIs
  }
};

/**
 * Obtiene estadísticas del cache
 */
const getEstadisticasCache = () => {
  return {
    entradas: cacheAPI.size,
    materiales: Array.from(cacheAPI.keys())
  };
};

module.exports = {
  aplicarSubEmpaque,
  precargarAPIsSubEmpaque,
  limpiarCacheAPI,
  getEstadisticasCache
}; 