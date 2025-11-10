const { getVentasBulk } = require('../databricksService');

// Cache global para evitar consultas repetidas
const cacheDatabricks = new Map();

/**
 * LIMPIAR CACHE DE DATABRICKS
 * 
 * Limpia completamente el cache de Databricks para forzar nuevas consultas.
 * Útil al inicio de cada procesamiento para evitar datos obsoletos.
 */
const limpiarCacheDatabricks = () => {
  const tamanoAnterior = cacheDatabricks.size;
  cacheDatabricks.clear();
  console.log(`[DATABRICKS CACHE] 🧹 Cache limpiado: ${tamanoAnterior} entradas eliminadas`);
  return tamanoAnterior;
};

/**
 * CARGAR DATOS DE VENTAS DE DATABRICKS
 * 
 * Carga datos de ventas trimestrales y anuales de Databricks para productos
 * que tienen Ctd.UMB = 0, optimizando las llamadas a la API.
 * 
 * @param {Array} datos - Dataset completo
 * @param {Object} configReglas - Configuración del sistema
 * @returns {Array} Datos con columnas VtasTrimDataBrick y VtasAnualDataBrick agregadas
 */
const cargarDatosVentasDatabricks = async (datos, configReglas, configCalculos = {}) => {
  console.log(`[entrada.xlsx] ${new Date().toISOString()} - Cargando datos de ventas de Databricks...`);
  
  try {
    console.log(`[DATABRICKS] Iniciando carga de datos para TODOS los productos`);
    
    // Obtener mostrador del primer registro
    const mostrador = datos[0]?.['Cliente'] || '';
    console.log(`[DATABRICKS] Mostrador obtenido del Excel (campo Cliente): ${mostrador}`);
    
    // NORMALIZAR MOSTRADOR TEMPRANO: Agregar ceros a la izquierda para que coincida con Databricks
    const mostradorNormalizado = mostrador.toString().padStart(10, '0');
    console.log(`[DATABRICKS] Mostrador normalizado para cache y queries: ${mostradorNormalizado}`);
    
    console.log(`[DATABRICKS] Total productos en dataset: ${datos.length}`);
    
    if (datos.length === 0) {
      console.log(`[DATABRICKS] No hay productos para procesar.`);
      return { datos: [], llamadasDatabricks: 0 };
    }
    
    // CAMBIO: Consultar TODOS los EANs para ReglaQ, pero identificar cuáles son para ReglaP
    const productosParaReglaP = datos.filter(item => {
      const ctdUMB = item['Ctd.UMB'];
      const estaVacio = ctdUMB === null || 
                       ctdUMB === undefined || 
                       ctdUMB === '' || 
                       ctdUMB === 0 || 
                       (typeof ctdUMB === 'string' && ctdUMB.trim() === '');
      return estaVacio;
    });
    
    console.log(`[DATABRICKS] Productos para ReglaP (Ctd.UMB vacío): ${productosParaReglaP.length} de ${datos.length}`);
    console.log(`[DATABRICKS] Productos para ReglaQ (TODOS): ${datos.length}`);
    console.log(`[DATABRICKS] NUEVA ESTRATEGIA: Consultar TODOS los EANs para ReglaQ`);
    
    // OPTIMIZACIÓN BULK CON CHUNKS: CONSULTA PARA TODOS LOS PRODUCTOS  
    console.log(`[DATABRICKS] CHUNK OPTIMIZATION: Obteniendo TODOS los datos por chunks...`);
    console.log(`[DATABRICKS] VERSION CHUNKS CONFIRMADA - TIMESTAMP: ${new Date().toISOString()}`);
    
    const tiempoInicio = Date.now();
    
    // Recolectar TODOS los EANs únicos (no solo los filtrados)
    const todosLosEANs = [...new Set(datos.map(item => item['EAN/UPC']))];
    console.log(`[DATABRICKS] EANs únicos a consultar: ${todosLosEANs.length}`);
    console.log(`[DATABRICKS] Primeros 10 EANs:`, todosLosEANs.slice(0, 10));
    console.log(`[DATABRICKS] Cliente (mostrador normalizado): ${mostradorNormalizado}`);
    
    // EANs únicos listos para consulta
    
    // LIMPIAR CACHE CON CLAVE INCORRECTA (mostrador sin normalizar)
    const cacheKeyIncorrecto = `${mostrador}_bulk`;
    if (cacheDatabricks.has(cacheKeyIncorrecto)) {
      console.log(`[DATABRICKS] LIMPIANDO cache incorrecto con clave: ${cacheKeyIncorrecto}`);
      cacheDatabricks.delete(cacheKeyIncorrecto);
    }
    
    // Verificar cache antes de consultar - USANDO MOSTRADOR NORMALIZADO
    const cacheKey = `${mostradorNormalizado}_bulk`;
    let resultadosBulk = [];
    let totalLlamadas = 0;
    
    if (cacheDatabricks.has(cacheKey)) {
      console.log(`[DATABRICKS] CACHE HIT: Usando datos en cache para mostrador ${mostradorNormalizado}`);
      resultadosBulk = cacheDatabricks.get(cacheKey);
    } else {
      console.log(`[DATABRICKS] CACHE MISS: Consultando Databricks en chunks configurables...`);
      
      // Usar configuración dinámica para chunks y paralelismo
      const eansPorQuery = configCalculos.eansPorQueryBricks || 50;
      const paralelismoMax = configCalculos.paralelismoBricks || 2;
      
      // Dividir en chunks configurables
      const chunks = [];
      for (let i = 0; i < todosLosEANs.length; i += eansPorQuery) {
        chunks.push(todosLosEANs.slice(i, i + eansPorQuery));
      }
      
      console.log(`[DATABRICKS] Dividido en ${chunks.length} chunks de máximo ${eansPorQuery} EANs cada uno`);
      
      // Procesar chunks con paralelismo configurable
      const PARALELISMO_MAX = paralelismoMax;
      console.log(`[DATABRICKS] PROCESANDO CON PARALELISMO LIMITADO: máximo ${PARALELISMO_MAX} chunks simultáneos...`);
      
      const tiempoParalelo = Date.now();
      const resultadosChunks = [];
      
      // Procesar en lotes de máximo 10 chunks
      for (let i = 0; i < chunks.length; i += PARALELISMO_MAX) {
        const loteChunks = chunks.slice(i, i + PARALELISMO_MAX);
        console.log(`[DATABRICKS] Procesando lote ${Math.floor(i/PARALELISMO_MAX) + 1}: chunks ${i + 1}-${Math.min(i + PARALELISMO_MAX, chunks.length)} (${loteChunks.length} chunks)...`);
        
        const promesasLote = loteChunks.map((chunk, index) => {
          console.log(`[DATABRICKS] Lanzando chunk ${i + index + 1}/${chunks.length} (${chunk.length} EANs)...`);
          return getVentasBulk(chunk, mostradorNormalizado);
        });
        
        const resultadosLote = await Promise.all(promesasLote);
        resultadosChunks.push(...resultadosLote);
      }
      const tiempoParaleloTotal = Date.now() - tiempoParalelo;
      
      // Combinar todos los resultados
      resultadosBulk = resultadosChunks.flat();
      totalLlamadas = chunks.length;
      
      console.log(`[DATABRICKS] PARALELO COMPLETADO: ${chunks.length} chunks en ${tiempoParaleloTotal}ms (~${Math.round(tiempoParaleloTotal/1000)}s)`);
      console.log(`[DATABRICKS] Velocidad paralela vs secuencial: ~${chunks.length}x más rápido`);
      
      // Guardar en cache
      cacheDatabricks.set(cacheKey, resultadosBulk);
      console.log(`[DATABRICKS] Datos guardados en cache para futuras consultas`);
    }
    
    console.log(`[DATABRICKS] Total registros obtenidos: ${resultadosBulk.length}`);
    
    // DEBUG: Verificar algunos resultados
    if (resultadosBulk.length > 0) {
      console.log(`[DATABRICKS] DEBUG - Ejemplo de resultados bulk:`, JSON.stringify(resultadosBulk.slice(0, 3), null, 2));
      console.log(`[DATABRICKS] DEBUG - Mostrador esperado: ${mostrador}`);
      console.log(`[DATABRICKS] DEBUG - Tipo de mostrador: ${typeof mostrador}`);
    }
    
    const tiempoTotal = Date.now() - tiempoInicio;
    console.log(`[DATABRICKS] CHUNK OPTIMIZATION COMPLETADO: ${datos.length} productos en ${tiempoTotal}ms (~${Math.round(tiempoTotal/1000)}s)`);
    console.log(`[DATABRICKS] Total llamadas realizadas: ${totalLlamadas} chunks vs ${datos.length * 2} llamadas individuales`);
    console.log(`[DATABRICKS] Cache activo: ${cacheDatabricks.size} entradas`);
    
    // Crear mapa de resultados para búsqueda rápida
    const mapaResultados = {};
    resultadosBulk.forEach(resultado => {
      const key = `${resultado.eanupc}_${resultado.customer}`;
      mapaResultados[key] = {
        trim: resultado.ventas_trim,
        anual: resultado.ventas_anual
      };
    });
    
    // DEBUG: Verificar el mapa de resultados
    const primerasClaves = Object.keys(mapaResultados).slice(0, 3);
    console.log(`[DATABRICKS] DEBUG - Primeras claves en mapa:`, primerasClaves);
    console.log(`[DATABRICKS] DEBUG - Total claves en mapa: ${Object.keys(mapaResultados).length}`);
    
    // NUEVO: Agregar columnas a TODOS los datos (para ReglaQ necesita todos)
    const statsEANs = {
      total: datos.length,
      encontrados: 0,
      noEncontrados: 0
    };
    
    const datosConDatabricks = datos.map(item => {
      const eanUPC = item['EAN/UPC'];
      
      // FORMATEAR EAN/UPC a 18 dígitos para que coincida con las claves de Databricks
      const eanUPCFormateado = eanUPC ? eanUPC.toString().padStart(18, '0') : '';
      
      // BUSCAR EN EL MAPA: Usar el customer tal como viene de Databricks (ya normalizado)
      // Los datos de Databricks vienen con customer ya como "0007052110"
      let resultado = null;
      let keyEncontrada = null;
      
      // Buscar la clave que corresponde a este EAN (ahora formateado a 18 dígitos)
      for (const [key, value] of Object.entries(mapaResultados)) {
        if (key.startsWith(`${eanUPCFormateado}_`)) {
          resultado = value;
          keyEncontrada = key;
          break;
        }
      }
      
      if (!resultado) {
        // Si no se encuentra en Databricks, valores por defecto
        statsEANs.noEncontrados++;
        console.warn(`[DATABRICKS] Material ${eanUPC} (${eanUPCFormateado}) NO ENCONTRADO en Databricks`);
        resultado = { trim: 0, anual: 0 };
      } else {
        // Datos encontrados exitosamente
        statsEANs.encontrados++;
        console.log(`[DATABRICKS] ✅ Material ${eanUPC} (${eanUPCFormateado}) encontrado - Trim: ${resultado.trim}, Anual: ${resultado.anual}`);
      }
      
      return {
        ...item,
        'VtasTrimDataBrick': resultado.trim,
        'VtasAnualDataBrick': resultado.anual
      };
    });
    
    // ESTADÍSTICAS FINALES
    const porcentajeEncontrados = Math.round((statsEANs.encontrados / statsEANs.total) * 100);
    console.log(`[DATABRICKS] ===== ESTADÍSTICAS DE DATOS =====`);
    console.log(`[DATABRICKS] EANs procesados: ${statsEANs.total}`);
    console.log(`[DATABRICKS] EANs encontrados: ${statsEANs.encontrados} (${porcentajeEncontrados}%)`);
    console.log(`[DATABRICKS] EANs no encontrados: ${statsEANs.noEncontrados} (${100 - porcentajeEncontrados}%)`);
    console.log(`[DATABRICKS] Chunks ejecutados: ${totalLlamadas}`);
    console.log(`[DATABRICKS] Cache entries: ${cacheDatabricks.size}`);
    console.log(`[DATABRICKS] ===============================`);
    
    console.log(`[DATABRICKS] Carga de datos completada. Columnas VtasTrimDataBrick y VtasAnualDataBrick agregadas`);
    console.log(`[DATABRICKS] TODOS los productos ahora tienen datos de Databricks: ${datos.length}`);
    console.log(`[DATABRICKS] Productos para ReglaP (Ctd.UMB vacío): ${productosParaReglaP.length}`);
    console.log(`[DATABRICKS] Productos para ReglaQ (TODOS): ${datos.length}`);
    
    console.log(`[entrada.xlsx] ${new Date().toISOString()} - Datos de Databricks cargados (${totalLlamadas} chunks para ${datos.length} productos)`);
    
    return { datos: datosConDatabricks, llamadasDatabricks: totalLlamadas };
    
  } catch (error) {
    console.error(`[DATABRICKS] Error cargando datos de Databricks:`, error);
    
    // NUEVO: Distinguir tipos de error
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('connection') || 
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many') ||
        errorMessage.includes('refused') ||
        errorMessage.includes('network') ||
        errorMessage.includes('auth')) {
      
      // ERROR TÉCNICO: No retornar datos, fallar completamente
      console.error(`[DATABRICKS] ERROR TÉCNICO DETECTADO: ${error.message}`);
      console.error(`[DATABRICKS] TIPO: Conexión/Red/Auth - NO SE PUEDE CONTINUAR SIN DATOS VÁLIDOS`);
      throw new Error(`Databricks error técnico (${errorMessage.includes('timeout') ? 'timeout' : 
                       errorMessage.includes('connection') ? 'conexión' : 
                       errorMessage.includes('rate limit') ? 'rate limit' : 
                       errorMessage.includes('auth') ? 'autenticación' : 'red'}): ${error.message}`);
      
    } else {
      // ERROR LÓGICO: Continuar con 0s pero alertar
      console.warn(`[DATABRICKS] ERROR LÓGICO detectado, continuando con valores 0: ${error.message}`);
      console.warn(`[DATABRICKS] Esto puede indicar: EANs inválidos, query incorrecta, permisos, etc.`);
      
      const datosConValoresCero = datos.map(item => ({
        ...item,
        'VtasTrimDataBrick': 0,
        'VtasAnualDataBrick': 0
      }));
      return { datos: datosConValoresCero, llamadasDatabricks: 0 };
    }
  }
};

module.exports = {
  cargarDatosVentasDatabricks,
  limpiarCacheDatabricks
};