/**
 * SISTEMA DE OPTIMIZACIÓN DE INVENTARIO - VERSIÓN MODULAR
 * 
 * Este archivo es el orquestador principal que coordina todas las reglas
 * de optimización de inventario en el orden correcto.
 */

// Importar sistema de logging
const { setupGlobalLogging, clearLogs } = require('./utils/logger');

// Importar todas las reglas
const { calcularValorOptimoRedondeado } = require('./rules/factorRedondeo');
const { calcularValorOptimoRescate } = require('./rules/optimoRescate');
const { reglaOptimoP } = require('./rules/reglaOptimoP');
const { reglaOptimoQ } = require('./rules/reglaOptimoQ');
const { aplicarSubEmpaque, precargarAPIsSubEmpaque, limpiarCacheAPI } = require('./rules/subEmpaque');
const { aplicarJoroba } = require('./rules/joroba');

// Importar servicios de datos
const { cargarDatosVentasDatabricks } = require('./data/databricksLoader');
const { leerDatosExcel } = require('./data/excelReader');

// Importar optimización con Brent's Method
const { optimizarFactorRedondeo, optimizarFactorPorSKUs } = require('./optimization/factorOptimizerBrent');


// Importar utilidades
const { calcularOptimoVenta } = require('./utils/optimoVentaCalculator');
const { exportarResultados } = require('./utils/excelExporter');
const { exportarAExcel, exportarACSV } = require('./utils/excelExporter');

/**
 * VALIDADOR DE COLUMNAS REQUERIDAS
 * 
 * Valida que el Excel tenga todas las columnas necesarias para el procesamiento
 * @param {Array} datos - Datos leídos del Excel
 * @returns {Object} Resultado de la validación
 */
const validarColumnasRequeridas = (datos) => {
  if (!datos || datos.length === 0) {
    return { 
      esValido: false, 
      columnasFaltantes: ['No hay datos en el Excel'],
      columnasEncontradas: []
    };
  }
  
  const columnas = Object.keys(datos[0]);
  const faltantes = [];
  const encontradas = [];
  
  // COLUMNAS OBLIGATORIAS
  const obligatorias = [
    { nombre: 'Cliente', variantes: ['Cliente'] },
    { nombre: 'Material', variantes: ['Material'] },
    { nombre: 'EAN/UPC', variantes: ['EAN/UPC', 'EANUPC', 'EAN', 'UPC'] },
    { nombre: 'Ctd.UMB', variantes: ['Ctd.UMB', 'CtdUMB', 'CantidadUMB'] },
    { nombre: 'Factor F', variantes: ['Factor F', 'FactorF'] },
    { nombre: 'Ponderación Tradicional', variantes: ['Ponderación Tradicional', 'PonderacionTradicional'] },
    { nombre: 'Factor 9', variantes: ['Factor 9', 'Factor9'] },
    { nombre: 'Factor D', variantes: ['Factor D', 'FactorD'] }
  ];
  
  // Validar columnas obligatorias
  obligatorias.forEach(({ nombre, variantes }) => {
    const encontrada = variantes.some(variante => columnas.includes(variante));
    if (encontrada) {
      encontradas.push(nombre);
    } else {
      faltantes.push(`${nombre} (esperado: ${variantes.join(' o ')})`);
    }
  });
  
  // Validar que haya al menos una columna de precio
  const tienePrecio = columnas.some(col => {
    const colLower = col.toLowerCase().replace(/\s+/g, '');
    return colLower.includes('preciofarmacia') || 
           colLower.includes('precio') || 
           colLower.includes('preciocompra');
  });
  
  if (tienePrecio) {
    encontradas.push('Precio (columna encontrada)');
  } else {
    faltantes.push('Precio Farmacia (o variantes: precio, preciocompra, etc.)');
  }
  
  // Validar que haya al menos una columna de inversión
  const tieneInversion = columnas.some(col => {
    const colLower = col.toLowerCase().replace(/\s+/g, '');
    return colLower.includes('montoventamostrador') || 
           (colLower.includes('monto') && colLower.includes('venta')) ||
           colLower.includes('importe');
  });
  
  if (tieneInversion) {
    encontradas.push('Inversión (columna encontrada)');
  } else {
    faltantes.push('Monto Venta Mostrador (o variantes: importe, etc.)');
  }
  
  return {
    esValido: faltantes.length === 0,
    columnasFaltantes: faltantes,
    columnasEncontradas: encontradas,
    totalColumnas: columnas.length,
    columnasDisponibles: columnas
  };
};

// Configuración por defecto
//  
//  diasDeInverionReporteSubido: 30,
const CONFIG_REGLAS_DEFAULT = {
  factorRedondeo: 0.43,
  diasInversionDeseados: 27.25, // dias de extencion de inventario
  diasDeInventario: 21,
  diasDeInverionReporteSubido: 30,
  diasDeInversionParaReglasP: 21, // es difrente valor al de diasInversionDeseados
  precioMaximo: 3500,
  joroba: 3.5,
  factorForzado: null // null = optimización automática con Brent's method
};

// Configuración de cálculos de Databricks
const CONFIG_CALCULOS_DATABRICKS = {
  paralelismoBricks: 2,        // Consultas simultáneas a Databricks
  eansPorQueryBricks: 50,      // EANs por consulta a Databricks
  timeoutBricks: 30000,        // Timeout por consulta en ms
  reintentosBricks: 3          // Reintentos en caso de fallo
};

// Configuración de cálculos de SubEmpaque (API Nadro)
const CONFIG_CALCULOS_SUBEMPAQUE = {
  paralelismoSubEmpaque: 5,    // Consultas simultáneas a API Nadro
  productsPorQuerySubEmpaque: 25, // Productos por consulta (API sí soporta bulk con OR)
  timeoutSubEmpaque: 15000,    // Timeout por consulta en ms (más tiempo para bulk)
  reintentosSubEmpaque: 2      // Reintentos en caso de fallo
};

/**
 * FUNCIÓN PRINCIPAL: PROCESAR EXCEL CON CONFIGURACIÓN
 * 
 * Orquesta todo el proceso de optimización de inventario:
 * 1. Cargar datos de Excel
 * 2. Cargar datos de Databricks
 * 3. Optimizar factor de redondeo
 * 4. Aplicar todas las reglas en secuencia
 * 5. Exportar resultados
 * 
 * @param {Buffer|string} input - Archivo Excel o ruta
 * @param {Object} customConfig - Configuración personalizada
 * @param {string} tipoProcesso - Tipo de proceso
 * @returns {Object} Resultados del procesamiento
 */
const procesarExcelConConfiguracion = async (input, customConfig = {}, tipoProcesso = 'general') => {
  const tiempoInicio = Date.now(); // ⏱️ INICIAR TIMER
  
  // Configurar logging global
  setupGlobalLogging();
  clearLogs();
  limpiarCacheAPI(); // Limpiar cache de API de Nadro
  
  try {
    // Combinar configuración por defecto con personalizada
    console.log('[CONFIG DEBUG NORMAL] CONFIG_REGLAS_DEFAULT:', JSON.stringify(CONFIG_REGLAS_DEFAULT, null, 2));
    console.log('[CONFIG DEBUG NORMAL] customConfig (normal):', JSON.stringify(customConfig, null, 2));
    
    const configReglas = { ...CONFIG_REGLAS_DEFAULT, ...customConfig };
    
    // 🔄 MAPEO: Si viene diasInversionDeseados del frontend, también usarlo para las reglas P
    if (customConfig && customConfig.diasInversionDeseados) {
      configReglas.diasDeInversionParaReglasP = customConfig.diasInversionDeseados;
    }
    
    console.log('[CONFIG DEBUG NORMAL] configReglas FINAL (merged):', JSON.stringify(configReglas, null, 2));
    
    // PASO 1: CARGAR DATOS
    console.log('[1] [excelReader] Iniciando lectura de Excel...');
    const datos = await leerDatosExcel(input, configReglas);
    console.log('[1] [excelReader] Completado - ' + datos.length + ' registros leídos');
    
    // PASO 1.5: VALIDAR COLUMNAS REQUERIDAS
    console.log('[1.5] [validador] Validando estructura de columnas...');
    const validacionColumnas = validarColumnasRequeridas(datos);
    if (!validacionColumnas.esValido) {
      console.error('[1.5] [validador] Faltan columnas obligatorias:', validacionColumnas.columnasFaltantes);
      console.error('[1.5] [validador] Columnas encontradas:', validacionColumnas.columnasEncontradas);
      console.error('[1.5] [validador] Columnas disponibles:', validacionColumnas.columnasDisponibles);
      
      const mensajeDetallado = `EXCEL INVÁLIDO - Faltan columnas obligatorias:\n\n` +
                              `COLUMNAS FALTANTES:\n${validacionColumnas.columnasFaltantes.map(col => `• ${col}`).join('\n')}\n\n` +
                              `COLUMNAS ENCONTRADAS:\n${validacionColumnas.columnasEncontradas.map(col => `• ${col}`).join('\n')}\n\n` +
                              `Agrega las columnas faltantes a tu Excel y vuelve a intentar.`;
      
      throw new Error(mensajeDetallado);
    }
    console.log('[1.5] [validador] Todas las columnas requeridas encontradas');
    console.log('[1.5] [validador] Columnas válidas:', validacionColumnas.columnasEncontradas.join(', '));
    
    // PASO 2: CARGAR DATOS DE DATABRICKS
    console.log('[2] [consulta databricks] Iniciando carga de datos de ventas...');
    const resultadoDatabricks = await cargarDatosVentasDatabricks(datos, configReglas, CONFIG_CALCULOS_DATABRICKS);
    const datosConDatabricks = resultadoDatabricks.datos;
    const llamadasDatabricks = resultadoDatabricks.llamadasDatabricks;
    console.log('[2] [consulta databricks] Completado - ' + llamadasDatabricks + ' llamadas realizadas');
    
    // PASO 2.5: PRECARGAR TODAS LAS APIS DE SUB EMPAQUE (UNA SOLA VEZ)
    console.log('[2.5] [precarga APIs] Precargando APIs de sub empaque...');
    await precargarAPIsSubEmpaque(datosConDatabricks, CONFIG_CALCULOS_SUBEMPAQUE);
    console.log('[2.5] [precarga APIs] Completado - APIs precargadas en cache');
    
    // PASO 3: CALCULAR INVERSIÓN ORIGINAL (ANTES DE OPTIMIZACIÓN)
    const montoVentaMostradorKey = Object.keys(datosConDatabricks[0] || {}).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      const coincide = keyLower.includes('montoventamostrador') || 
                      (keyLower.includes('monto') && keyLower.includes('venta') && keyLower.includes('mostrador'));
      return coincide;
    });
    
    let valorParseado = 0;
    if (montoVentaMostradorKey && datosConDatabricks.length > 0) {
      const primerItem = datosConDatabricks[0][montoVentaMostradorKey];
      if (primerItem !== undefined) {
        const valorString = primerItem.toString().replace(/[^0-9.-]+/g, '');
        valorParseado = parseFloat(valorString) || 0;
      }
    }
    
    // PASO 4: DETERMINAR FACTOR A USAR (OPTIMIZADO O FORZADO)
    let factorFinal, tipoFactor, resultadoOptimizacion, historialIteraciones;
    
    console.log('[DEBUG V27] configReglas.factorForzado:', configReglas.factorForzado);
    console.log('[DEBUG V27] configReglas.factorForzado !== null:', configReglas.factorForzado !== null);
    console.log('[DEBUG V27] configReglas.factorForzado !== undefined:', configReglas.factorForzado !== undefined);
    
    // USAR FACTOR FORZADO SI ESTÁ CONFIGURADO
    if (configReglas.factorForzado !== null && configReglas.factorForzado !== undefined) {
      factorFinal = configReglas.factorForzado;
      tipoFactor = 'factor_seleccionado';
      
      // Calcular con el factor forzado
      const { calcularConFactor } = require('./optimization/calculationEngine');
      resultadoOptimizacion = await calcularConFactor(datosConDatabricks, factorFinal, configReglas, valorParseado);
      resultadoOptimizacion.factor = factorFinal; // Asegurar que el factor esté en el resultado
      historialIteraciones = []; //AGREGADO: Inicializar array vacío para factor forzado
      
    } else {
      console.log('[3] [Factor de redondeo] Iniciando optimización automática...');
      
      try {
        // ═══════════════════════════════════════════════════════
        // DECISIÓN: ¿Optimizar por MONTO (SPP) o PRODUCTOS (SKUs)?
        // DETECCIÓN AUTOMÁTICA: Leer columna "Skus" de la primera fila
        // ═══════════════════════════════════════════════════════
        const primeraFila = datosConDatabricks[0] || {};

        // Helper: normaliza un nombre de columna a minúsculas sin espacios, guiones y acentos
        const normalizarCol = (s) => s
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[\s_\-]+/g, '');

        const buscarColumna = (patrones) => {
          const claves = Object.keys(primeraFila);
          for (const clave of claves) {
            const norm = normalizarCol(clave);
            if (patrones.some(p => norm === normalizarCol(p))) return primeraFila[clave];
          }
          return undefined;
        };

        // LEER dias_inversion POR CLIENTE desde el Excel (sobreescribe customConfig)
        const diasInversionExcel = buscarColumna([
          'dias_inversion', 'diasinversion', 'dias de inversion', 'dias de inversión',
          'diasdeinversion', 'dias_inversion_deseados', 'diasinversiondeseados',
          'dias de inversion deseados', 'días de inversión deseados'
        ]);
        if (diasInversionExcel !== undefined && diasInversionExcel !== '' && !isNaN(diasInversionExcel)) {
          configReglas.diasInversionDeseados = parseFloat(diasInversionExcel);
          configReglas.diasDeInversionParaReglasP = parseFloat(diasInversionExcel);
          console.log(`[CONFIG] dias_inversion leído del Excel: ${configReglas.diasInversionDeseados}`);
        }

        // LEER porcentaje_joroba POR CLIENTE desde el Excel (sobreescribe customConfig)
        const jorobaExcel = buscarColumna([
          'porcentaje_joroba', 'porcentajedejoroba', 'porcentaje de joroba',
          'pct_joroba', 'pctjoroba', 'joroba', '%joroba', 'porcjoroba',
          'porcentaje joroba'
        ]);
        if (jorobaExcel !== undefined && jorobaExcel !== '' && !isNaN(jorobaExcel)) {
          configReglas.joroba = parseFloat(jorobaExcel);
          console.log(`[CONFIG] porcentaje_joroba leído del Excel: ${configReglas.joroba}`);
        }

        const skusObjetivo = buscarColumna(['skus', 'skusobjetivo', 'skus objetivo']);

        if (skusObjetivo && skusObjetivo !== '' && !isNaN(skusObjetivo)) {
          // ═══ CÁLCULO POR SKUS ═══
          const skusNumero = parseInt(skusObjetivo);
          console.log('[3] [Factor de redondeo] Optimizando por SKUs. Objetivo: ' + skusNumero);
          resultadoOptimizacion = await optimizarFactorPorSKUs(
            datosConDatabricks,
            configReglas.factorRedondeo,
            configReglas,
            valorParseado,
            { skusObjetivo: skusNumero }
          );
        } else {
          // ═══ CÁLCULO POR MONTO DE INVERSIÓN ═══
          resultadoOptimizacion = await optimizarFactorRedondeo(
            datosConDatabricks, 
            configReglas.factorRedondeo, 
            configReglas,
            valorParseado
          );
        }

        factorFinal = resultadoOptimizacion.factor;
        historialIteraciones = resultadoOptimizacion.historialIteraciones;
        tipoFactor = 'factor_optimo';
        console.log('[3] [Factor de redondeo] Factor óptimo encontrado: ' + factorFinal);
      } catch (error) {
        console.error('[3] [ERROR] Error en optimización:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          errorCompleto: error
        });
        throw error;
      }
    }
    
    // PASO 5: APLICAR REGLAS EN SECUENCIA
    console.log('[4] [Factor de redondeo] Aplicando regla de redondeo...');
    const datosConRedondeo = calcularValorOptimoRedondeado(
      resultadoOptimizacion.datosFinales || datosConDatabricks, 
      { ...configReglas, factorRedondeo: factorFinal }
    );
    
    // Configuración con factor actualizado para TODAS las reglas
    const configConFactorFinal = { ...configReglas, factorRedondeo: factorFinal };
    
    console.log('[5] [calculo rescate] Aplicando valor óptimo rescate...');
    const datosConRescate = calcularValorOptimoRescate(datosConRedondeo, configConFactorFinal);
    
    console.log('[6] [calculo OptimoP] Aplicando regla OptimoP...');
    
    // DEBUG: Verificar datos ANTES de OptimoP
    const itemTestAntes = datosConRescate.find(item => item['EAN/UPC'] == '7501073025417');
    if (itemTestAntes) {
      console.log(`[DEBUG ANTES-OPTIMO-P] Databricks ANTES de OptimoP: trim=${itemTestAntes['VtasTrimDataBrick']}, anual=${itemTestAntes['VtasAnualDataBrick']}`);
    } else {
      console.log(`[DEBUG ANTES-OPTIMO-P] EAN 7501073025417 NO encontrado antes de OptimoP`);
    }
    
    const datosConOptimoP = reglaOptimoP(datosConRescate, configConFactorFinal);
    
    // DEBUG: Verificar si OptimoP mantiene los datos de Databricks
    const itemTestP = datosConOptimoP.find(item => item['EAN/UPC'] == '7502240450049');
    if (itemTestP) {
      console.log(`[DEBUG OPTIMO-P] Databricks después de OptimoP: trim=${itemTestP['VtasTrimDataBrick']}, anual=${itemTestP['VtasAnualDataBrick']}`);
    }
    
    console.log('[7] [calculo OptimoQ] Aplicando regla OptimoQ...');
    const datosConOptimoQ = reglaOptimoQ(datosConOptimoP, configConFactorFinal);
    
    // DEBUG: Verificar si OptimoQ mantiene los datos de Databricks
    const itemTestQ = datosConOptimoQ.find(item => item['EAN/UPC'] == '7502240450049');
    if (itemTestQ) {
      console.log(`[DEBUG OPTIMO-Q] Databricks después de OptimoQ: trim=${itemTestQ['VtasTrimDataBrick']}, anual=${itemTestQ['VtasAnualDataBrick']}`);
    }
    
    console.log('[8] [calculo SubEmpaque] Aplicando sub empaque...');
    const datosConSubEmpaque = await aplicarSubEmpaque(datosConOptimoQ);
    
    // DEBUG: Verificar si SubEmpaque mantiene los datos de Databricks
    const itemTestSub = datosConSubEmpaque.find(item => item['EAN/UPC'] == '7502240450049');
    if (itemTestSub) {
      console.log(`[DEBUG SUB-EMPAQUE] Databricks después de SubEmpaque: trim=${itemTestSub['VtasTrimDataBrick']}, anual=${itemTestSub['VtasAnualDataBrick']}`);
    }
    
    // Ordenar por sub empaque (primario) y precio farmacia (secundario) - ANTES DE JOROBA
    const datosConSubEmpaqueOrdenados = datosConSubEmpaque.sort((a, b) => {
      // Criterio primario: sub empaque (mayor a menor)
      const valorA = parseFloat(a['sub empaque']) || 0;
      const valorB = parseFloat(b['sub empaque']) || 0;
      
      if (valorB !== valorA) {
        return valorB - valorA; // Orden descendente por sub empaque
      }
      
      // Criterio secundario de desempate: precio farmacia (mayor a menor)
      const precioFarmaciaKey = Object.keys(a).find(key => 
        key.toLowerCase().replace(/\s+/g, '').includes('Precio Farmacia')
      );
      
      const precioA = precioFarmaciaKey ? parseFloat(a[precioFarmaciaKey]) || 0 : 0;
      const precioB = precioFarmaciaKey ? parseFloat(b[precioFarmaciaKey]) || 0 : 0;
      
      return precioB - precioA; // Orden descendente por precio farmacia
    });
    
    console.log('[9] [calculo joroba] Aplicando joroba ' + configConFactorFinal.joroba + '%...');
    const datosConJoroba = await aplicarJoroba(datosConSubEmpaqueOrdenados, configConFactorFinal);
    
    console.log('[10] [calculo OptimoVenta] Calculando óptimo venta final...');
    const datosFinales = calcularOptimoVenta(datosConJoroba, configConFactorFinal);
    
    // PASO 6: EXPORTAR RESULTADOS
    const nombreBase = `datos_procesados_${tipoProcesso}_${tipoFactor}`;
    
    // DEBUG: Verificar datos de Databricks antes de exportar
    const eanTest = '7501073025417';
    const itemTest = datosFinales.find(item => item['EAN/UPC'] == eanTest);
    if (itemTest) {
      console.log(`[DEBUG EXPORT] EAN ${eanTest} antes de exportar:`, {
        VtasTrimDataBrick: itemTest['VtasTrimDataBrick'],
        VtasAnualDataBrick: itemTest['VtasAnualDataBrick'],
        tipoTrim: typeof itemTest['VtasTrimDataBrick'],
        tipoAnual: typeof itemTest['VtasAnualDataBrick']
      });
    } else {
      console.log(`[DEBUG EXPORT] EAN ${eanTest} NO encontrado en datosFinales`);
    }
    
    const archivoExcel = await exportarAExcel(datosFinales, `${nombreBase}.xlsx`);
    const archivoCSV = exportarACSV(datosFinales, `${nombreBase}.csv`);
    
    // PASO 7: GENERAR RESUMEN
    const tiempoProcesamiento = Date.now(); // ⏱️ TERMINAR TIMER
    const tiempoEjecucionMs = tiempoProcesamiento - tiempoInicio;
    
    // 📋 RESUMEN FINAL DE PROCESAMIENTO  
    console.log(`[OPTIMIZATION] ===== RESUMEN FINAL PROCESAMIENTO =====`);
    console.log(`[OPTIMIZATION] Total registros procesados: ${datosFinales.length}`);
    console.log(`[OPTIMIZATION] Factor final: ${factorFinal} (inicial: ${configReglas.factorRedondeo})`);
    console.log(`[OPTIMIZATION] Método usado: ${resultadoOptimizacion?.algoritmo || 'Factor Manual'}`);
    if (resultadoOptimizacion?.iteracionesRealizadas) {
      console.log(`[OPTIMIZATION] Iteraciones: ${resultadoOptimizacion.iteracionesRealizadas}`);
    }
    console.log(`[OPTIMIZATION] Tiempo total: ${Math.round(tiempoEjecucionMs/1000)}s`);
    console.log(`[OPTIMIZATION] `);
    console.log(`[OPTIMIZATION]  ===== REGLAS APLICADAS EN ORDEN =====`);
    console.log(`[OPTIMIZATION] Factor Redondeo: ${factorFinal} ${resultadoOptimizacion ? '(optimizado automáticamente)' : '(manual)'}`);
    console.log(`[OPTIMIZATION] Óptimo Rescate: Aplicado según configuración`);
    console.log(`[OPTIMIZATION] Regla Óptimo P: Aplicada`);
    console.log(`[OPTIMIZATION] Regla Óptimo Q: Aplicada`);
    console.log(`[OPTIMIZATION] Sub Empaque: Consultado APIs (cache optimizado)`);
    console.log(`[OPTIMIZATION] Joroba: ${configConFactorFinal.joroba}% aplicado`);
    console.log(`[OPTIMIZATION] Óptimo Venta: Calculado como resultado final`);
    console.log(`[OPTIMIZATION] `);
    console.log(`[OPTIMIZATION] ===== CONFIGURACIÓN UTILIZADA =====`);
    console.log(`[OPTIMIZATION] Factor Redondeo: ${factorFinal}`);
    console.log(`[OPTIMIZATION] Joroba: ${configConFactorFinal.joroba}%`);
    console.log(`[OPTIMIZATION] Días Inversión Deseados: ${configConFactorFinal.diasInversionDeseados}`);
    console.log(`[OPTIMIZATION] Días Reporte Subido: ${configConFactorFinal.diasDeInverionReporteSubido}`);
    console.log(`[OPTIMIZATION] Precio Máximo: $${configConFactorFinal.precioMaximo}`);
    console.log(`[OPTIMIZATION] `);
    console.log(`[OPTIMIZATION] ===== PROCESAMIENTO COMPLETADO =====`);
    console.log(`[OPTIMIZATION] Archivo Excel generado con factor: ${factorFinal}`);
    console.log(`[OPTIMIZATION] Sistema Factor de Redondeo - Procesamiento Exitoso!`);
    
    const resumen = generarResumenFinal(datosFinales, resultadoOptimizacion, configConFactorFinal, valorParseado, llamadasDatabricks, tiempoEjecucionMs);
    
    console.log('[resumen final] Registros: ' + resumen.registros + ', Factor: ' + resumen.factorOptimo + ', RegistrosMayorCero: ' + resumen.registrosMayorCero);
    
    return {
      datos: datosFinales,
      resumenFinal: resumen,
      rutaArchivoExcel: archivoExcel,
      archivoSalidaExcel: archivoExcel, // Para compatibilidad con el controller
      archivoSalidaCSV: archivoCSV,
      factorRedondeoEncontrado: factorFinal,
      convergenciaData: historialIteraciones || [] // AGREGADO: Datos de convergencia
    };
    
  } catch (error) {
    console.error('[ERROR] Error en procesamiento:', error);
    throw error;
  }
};

/**
 * GENERAR RESUMEN FINAL
 */
const generarResumenFinal = (datos, resultadoOptimizacion, configReglas, inversionOriginalForzada, llamadasDatabricks = 0, tiempoEjecucionMs = 0) => {
  const sumaTotal = datos.length > 0 ? datos[datos.length - 1]['suma optimo venta'] || 0 : 0;
  const registrosMayorCero = datos.filter(item => (item['optimo venta'] || 0) > 0).length;
  
  // Usar el valor parseado forzado si está disponible, sino intentar obtenerlo
  let inversionOriginal = 0;
  if (inversionOriginalForzada !== undefined && !isNaN(inversionOriginalForzada)) {
    inversionOriginal = inversionOriginalForzada;
  } else {
    // Buscar en múltiples campos posibles
    const posiblesCampos = ['Monto Venta Mostrador', 'Monto Venta', 'Venta Mostrador', 'Importe', 'Precio Farmacia', 'Importe Óptimo Final'];
    let campoEncontrado = null;
    
    for (const campo of posiblesCampos) {
      if (datos[0] && datos[0][campo] !== undefined) {
        campoEncontrado = campo;
        break;
      }
    }
    
    if (campoEncontrado) {
      // CORREGIDO: Tomar solo el primer producto porque el valor se repite en todas las filas
      const primerItem = datos[0][campoEncontrado];
      if (primerItem !== undefined) {
        const valorString = primerItem.toString().replace(/[^0-9.-]+/g, '');
        inversionOriginal = parseFloat(valorString) || 0;
      }
    }
  }
  
  const inversionDeseada = inversionOriginal > 0 ? 
    (inversionOriginal / configReglas.diasDeInverionReporteSubido) * configReglas.diasInversionDeseados : 0;
  
  return {
    timestamp: new Date().toISOString(),
    registros: datos.length,
    registrosMayorCero: registrosMayorCero,
    sumaTotal: sumaTotal,
    factorOptimo: resultadoOptimizacion.factor,
    diasInversionDeseados: configReglas.diasInversionDeseados,
    inversionOriginal: inversionOriginal,
    inversionDeseada: inversionDeseada,
    llamadasDatabricks: llamadasDatabricks,
    tiempoEjecucionMs: tiempoEjecucionMs //AGREGAR TIEMPO DE EJECUCIÓN
  };
};

/**
 * NUEVA FUNCIÓN CON PROGRESO EN TIEMPO REAL
 * 
 * Procesa Excel con callback de progreso para mostrar el avance paso a paso
 * @param {Buffer} excelBuffer - Buffer del archivo Excel
 * @param {Object} customConfig - Configuración personalizada
 * @param {Function} progressCallback - Función callback para reportar progreso (stage, progress, details)
 * @returns {Object} Resultado del procesamiento
 */
const procesarExcelConConfigConProgreso = async (excelBuffer, customConfig = {}, progressCallback) => {
  const tiempoInicio = Date.now();
  
  try {
    // Combinar configuración por defecto con parámetros personalizados
    console.log('[CONFIG DEBUG] CONFIG_REGLAS_DEFAULT:', JSON.stringify(CONFIG_REGLAS_DEFAULT, null, 2));
    console.log('[CONFIG DEBUG] customConfig (del frontend):', JSON.stringify(customConfig, null, 2));
    
    const configReglas = { ...CONFIG_REGLAS_DEFAULT, ...customConfig };
    
    console.log('[CONFIG DEBUG] configReglas FINAL (merged):', JSON.stringify(configReglas, null, 2));
    
    progressCallback('Leyendo archivo Excel...', 10, `Archivo recibido: ${(excelBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // PASO 1: Lectura y preparación de datos
    console.log('[1] [excelReader] Iniciando lectura de Excel (frontend)...');
    const timestampInicio = Date.now();
    const datos = await leerDatosExcel(excelBuffer, configReglas);
    const tiempoLectura = Date.now() - timestampInicio;
    console.log('[1] [excelReader] Completado - ' + datos.length + ' registros leídos');
    
    // Validar columnas requeridas
    const validacionColumnas = validarColumnasRequeridas(datos);
    if (!validacionColumnas.esValido) {
      progressCallback('Error de validación de columnas', 0, `Faltan columnas obligatorias: ${validacionColumnas.columnasFaltantes.join(', ')}. Columnas encontradas: ${validacionColumnas.columnasEncontradas.join(', ')}.`);
      console.error('Error de validación de columnas:', validacionColumnas);
      throw new Error(`Error de validación de columnas: ${validacionColumnas.columnasFaltantes.join(', ')}.`);
    }
    progressCallback('Archivo Excel cargado', 20, `${datos.length} productos encontrados`);

    // PASO 2: Cargar datos de Databricks
    progressCallback('Cargando datos de ventas...', 25, 'Consultando datos de ventas trimestrales y anuales');
    console.log('[2] [consulta databricks] Iniciando carga de datos de ventas (frontend)...');
    
    const resultadoDatabricks = await cargarDatosVentasDatabricks(datos, configReglas);
    const datosConDatabricks = resultadoDatabricks.datos;
    const llamadasDatabricks = resultadoDatabricks.llamadasDatabricks;
    console.log('[2] [consulta databricks] Completado - ' + llamadasDatabricks + ' llamadas realizadas');
    
    // PASO 2.5: PRECARGAR TODAS LAS APIS DE SUB EMPAQUE (UNA SOLA VEZ)
    progressCallback('Precargando APIs externas...', 28, 'Optimizando consultas de sub empaque');
    console.log('[2.5] [precarga APIs] Precargando APIs de sub empaque (frontend)...');
    await precargarAPIsSubEmpaque(datosConDatabricks, CONFIG_CALCULOS_SUBEMPAQUE);
    console.log('[2.5] [precarga APIs] Completado - APIs precargadas en cache');
    
    progressCallback('Datos de ventas listos', 30, 'Listo para optimizar factor de redondeo');

    // PASO 3: CALCULAR INVERSIÓN ORIGINAL (ANTES DE OPTIMIZACIÓN)
    const montoVentaMostradorKey2 = Object.keys(datosConDatabricks[0] || {}).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      const coincide = keyLower.includes('montoventamostrador') || 
                      (keyLower.includes('monto') && keyLower.includes('venta') && keyLower.includes('mostrador'));
      return coincide;
    });
    
    let valorParseado2 = 0;
    if (montoVentaMostradorKey2 && datosConDatabricks.length > 0) {
      const primerItem = datosConDatabricks[0][montoVentaMostradorKey2];
      if (primerItem !== undefined) {
        const valorString = primerItem.toString().replace(/[^0-9.-]+/g, '');
        valorParseado2 = parseFloat(valorString) || 0;
      }
    }

    // PASO 4: DETERMINAR FACTOR A USAR (OPTIMIZADO O FORZADO)
    let factorFinal2, tipoFactor2, resultadoOptimizacion2, historialIteraciones;
    
    if (configReglas.factorForzado !== null && configReglas.factorForzado !== undefined) {
      // USAR FACTOR FORZADO
      progressCallback('Usando factor forzado...', 35, `Factor seleccionado: ${configReglas.factorForzado}`);
      console.log('[3] [Factor de redondeo] Usando factor forzado: ' + configReglas.factorForzado + ' (frontend)');
      
      factorFinal2 = configReglas.factorForzado;
      tipoFactor2 = 'factor_seleccionado';
      
      // Calcular con el factor forzado
      const { calcularConFactor } = require('./optimization/calculationEngine');
      resultadoOptimizacion2 = await calcularConFactor(datosConDatabricks, factorFinal2, configReglas, valorParseado2);
      resultadoOptimizacion2.factor = factorFinal2; // Asegurar que el factor esté en el resultado
      historialIteraciones = []; // ✅ AGREGADO: Inicializar array vacío para factor forzado
      
      progressCallback('Factor aplicado', 45, `Factor seleccionado: ${factorFinal2}`);
      
    } else {
      // OPTIMIZACIÓN AUTOMÁTICA
      progressCallback('Optimizando factor de redondeo...', 35, 'Calculando factor óptimo automáticamente');
      console.log('[3] [Factor de redondeo] Iniciando optimización automática (frontend)...');
      
      const timestampOptimizacion = Date.now();
      
      resultadoOptimizacion2 = await optimizarFactorRedondeo(
        datosConDatabricks, 
        configReglas.factorRedondeo, 
        configReglas,
        valorParseado2
      );
      const tiempoOptimizacion = Date.now() - timestampOptimizacion;
      console.log('[3] [Factor de redondeo] Factor óptimo encontrado: ' + resultadoOptimizacion2.factor + ' (frontend)');
      
      factorFinal2 = resultadoOptimizacion2.factor;
      historialIteraciones = resultadoOptimizacion2.historialIteraciones;
      console.log('ESTO ES LO QUE invenadroCalc_modular HISTORIAL ITERACIONES (frontend)', historialIteraciones);
      tipoFactor2 = 'factor_optimo';
      
      progressCallback('Factor óptimo encontrado', 45, `Factor: ${factorFinal2}`);
    }
    
    // PASO 5: Aplicar todas las reglas en secuencia
    progressCallback('Aplicando Regla 1: Valor Óptimo Redondeado', 50, 'Factor F + Ponderación Tradicional con redondeo inteligente');
    console.log('[4] [Factor de redondeo] Aplicando regla de redondeo (frontend)...');
    
    const datosConRedondeo = calcularValorOptimoRedondeado(
      resultadoOptimizacion2.datosFinales || datosConDatabricks, 
      { ...configReglas, factorRedondeo: factorFinal2 }
    );
    
    // Configuración con factor actualizado para TODAS las reglas
    const configConFactorFinal2 = { ...configReglas, factorRedondeo: factorFinal2 };
    
    progressCallback('Aplicando Regla 2: Valor Óptimo Rescate', 60, 'Rescatando SKUs con Factor 9 o Factor D');
    console.log('[5] [calculo rescate] Aplicando valor óptimo rescate (frontend)...');
    const datosConRescate = calcularValorOptimoRescate(datosConRedondeo, configConFactorFinal2);
    
    progressCallback('Aplicando Regla 3: OptimoP', 65, 'Aplicando fórmula de OptimoP con datos de Databricks');
    console.log('[6] [calculo OptimoP] Aplicando regla OptimoP (frontend)...');
    const datosConOptimoP = reglaOptimoP(datosConRescate, configConFactorFinal2);
    
    progressCallback('Aplicando Regla 4: OptimoQ', 70, 'Aplicando fórmula de OptimoQ');
    console.log('[7] [calculo OptimoQ] Aplicando regla OptimoQ (frontend)...');
    const datosConOptimoQ = reglaOptimoQ(datosConOptimoP, configConFactorFinal2);
    
    progressCallback('Aplicando Regla 5: Sub Empaque', 75, 'Optimizando productos con descripción terminada en "S"');
    console.log('[8] [calculo SubEmpaque] Aplicando sub empaque (frontend)...');
    const datosConSubEmpaque = await aplicarSubEmpaque(datosConOptimoQ);
    
    // Ordenar por sub empaque (primario) y precio farmacia (secundario) - ANTES DE JOROBA
    const datosConSubEmpaqueOrdenados = datosConSubEmpaque.sort((a, b) => {
      // Criterio primario: sub empaque (mayor a menor)
      const valorA = parseFloat(a['sub empaque']) || 0;
      const valorB = parseFloat(b['sub empaque']) || 0;
      
      if (valorB !== valorA) {
        return valorB - valorA; // Orden descendente por sub empaque
      }
      
      // Criterio secundario de desempate: precio farmacia (mayor a menor)
      const precioFarmaciaKey = Object.keys(a).find(key => 
        key.toLowerCase().replace(/\s+/g, '').includes('preciofarmacia') ||
        key.toLowerCase().replace(/\s+/g, '').includes('precio') && key.toLowerCase().includes('farmacia')
      );
      
      const precioA = precioFarmaciaKey ? parseFloat(a[precioFarmaciaKey]) || 0 : 0;
      const precioB = precioFarmaciaKey ? parseFloat(b[precioFarmaciaKey]) || 0 : 0;
      
      return precioB - precioA; // Orden descendente por precio farmacia
    });
    
    progressCallback('Aplicando Regla 6: Joroba', 80, `Incrementando ${configConFactorFinal2.joroba}% de SKUs de valor=1 a valor=2`);
    console.log('[9] [calculo joroba] Aplicando joroba ' + configConFactorFinal2.joroba + '% (frontend)...');
    const datosConJoroba = await aplicarJoroba(datosConSubEmpaqueOrdenados, configConFactorFinal2);
    
    progressCallback('Calculando óptimo venta final', 85, 'Generando valores monetarios finales');
    console.log('[10] [calculo OptimoVenta] Calculando óptimo venta final (frontend)...');
    const datosFinales = calcularOptimoVenta(datosConJoroba, configConFactorFinal2);

    progressCallback('Generando archivo Excel...', 90, 'Exportando resultados optimizados');

    const filasOriginales = datos.length;
    const tiempoFinal = Date.now();
    const tiempoTranscurrido = tiempoFinal - tiempoInicio;

    // Calcular estadísticas finales
    const sumaTotal = datosFinales.reduce((acc, item) => acc + (item['optimo venta'] || 0), 0);
    const sumaOptimioVentaFinal = datosFinales.length > 0 ? datosFinales[datosFinales.length - 1]['suma optimo venta'] || 0 : 0;
    
    // Contar registros con valor mayor a 0
    const registrosMayoresACero = datosFinales.filter(item => {
      const valorOptimo = item['optimo venta'] || 0;
      return valorOptimo > 0;
    }).length;
    
    // Generar resumen usando la función modular
    const tiempoProcesamientoFinal = Date.now(); 
    const tiempoEjecucionMs = tiempoProcesamientoFinal - tiempoInicio;
    const resumen = generarResumenFinal(datosFinales, resultadoOptimizacion2, configConFactorFinal2, valorParseado2, llamadasDatabricks, tiempoEjecucionMs);
    console.log('[11] [resumen final] Registros: ' + resumen.registros + ', Factor: ' + resumen.factorOptimo + ', RegistrosMayorCero: ' + resumen.registrosMayorCero + ' (frontend)');

    // Exportar los datos procesados
    console.log('LLEGANDO A EXPORTAR EXCEL');
    console.log('ANTES DE exportarAExcel');
    const nombreBase2 = `datos_procesados_frontend_${tipoFactor2}`;
    console.log('Intentando exportar Excel con nombre:', `${nombreBase2}.xlsx`);
    console.log('Datos a exportar:', datosFinales.length, 'registros');
    console.log('LLAMANDO A exportarAExcel...');
    const archivoExcel = await exportarAExcel(datosFinales, `${nombreBase2}.xlsx`);
    console.log('DESPUÉS DE exportarAExcel');
    console.log('Resultado de exportarAExcel:', archivoExcel);
    console.log('Tipo de archivoExcel:', typeof archivoExcel);
    console.log('¿archivoExcel es truthy?:', !!archivoExcel);
    console.log('archivoExcel.split("/").pop():', archivoExcel ? archivoExcel.split('/').pop() : 'NO HAY ARCHIVO');
    
    progressCallback('Procesamiento completado', 95, `${registrosMayoresACero} productos optimizados`);

    console.log(' [JULIAN] ESTO ES LO QUE invenadroCalc_modular ya para mandar el dato al frontend', historialIteraciones);
    return {
      totalFilasOriginales: filasOriginales,
      totalFilasExportadas: datosFinales.length,
      archivoEntrada: 'buffer_upload',
      archivoSalidaExcel: archivoExcel ? archivoExcel.split('/').pop() : null,
      tiempoCalculoMs: tiempoTranscurrido,
      calculado: new Date().toISOString(),
      configUsada: configConFactorFinal2,
      resumenFinal: resumen,
      datos: datosFinales,
      rutaArchivoExcel: archivoExcel,
      convergenciaData: historialIteraciones,
    };
  } catch (error) {
    progressCallback('Error en procesamiento', 0, error.message);
    console.error("[ERROR] Error procesando Excel con progreso:", error);
    throw error;
  }
};

// Exportar funciones principales
module.exports = {
  procesarExcelConConfiguracion,
  procesarExcelConConfigConProgreso,
  CONFIG_REGLAS_DEFAULT
}; 