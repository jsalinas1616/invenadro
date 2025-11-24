const XLSX = require("xlsx");
const fs = require("fs");
const { exportarAExcel, exportarACSV } = require('./utils/excelExporter');

/**
 * ALGORITMO DE OPTIMIZACIÓN DE INVENTARIO CON FACTOR DE REDONDEO
 * 
 * Este algoritmo aplica 4 reglas secuenciales para optimizar la inversión en inventario:
 * 1. Valor Óptimo Redondeado: Factor F + Ponderación Tradicional con umbral de redondeo
 * 2. Valor Óptimo Rescate: Rescata SKUs con valor 0 usando Factor 9 o Factor D
 * 3. Joroba: Aplica un % configurable a SKUs con valor = 1 para subirlos a 2
 * 4. Sub Empaque: Reemplaza con Óptimo Premium si descripción termina en "S"
 * 
 * El algoritmo también optimiza automáticamente el factor de redondeo para minimizar
 * la diferencia entre la inversión deseada y la suma óptima final.
 */

// Configuración por defecto del sistema
const CONFIG_REGLAS_DEFAULT = {
  factorRedondeo: 0.47,        // Umbral para redondear hacia arriba/abajo (0.47 = 47%)
  joroba: 3.5,                 // Porcentaje de SKUs con valor=1 a cambiar a valor=2
  diasInversionDeseados: 27,   // Días de inventario objetivo
  diasDeInverionReporteSubido: 34,  // Días de inventario del reporte actual
  precioMaximo: 3500,          // Precio máximo para incluir en el cálculo
};

/**
 * REGLA 1: CALCULAR VALOR ÓPTIMO REDONDEADO
 * 
 * Suma Factor F + Ponderación Tradicional y aplica redondeo inteligente:
 * - Si la parte decimal >= factorRedondeo → redondea hacia ARRIBA
 * - Si la parte decimal < factorRedondeo → redondea hacia ABAJO
 * 
 * Ejemplo con factor 0.47:
 * - 2.60 → decimal 0.60 >= 0.47 → resultado = 3
 * - 2.30 → decimal 0.30 < 0.47 → resultado = 2
 * 
 * @param {Array} datos - Array de objetos con datos de inventario
 * @param {Object} configReglas - Configuración con factorRedondeo
 * @returns {Array} Datos con campo 'valor optimo redondeado' agregado
 */
const calcularValorOptimoRedondeado = (datos, configReglas) => {
  return datos.map(item => {
    // Buscar las columnas de forma flexible (case-insensitive y sin espacios)
    const factorFKey = Object.keys(item).find(key => 
      key.toLowerCase().replace(/\s+/g, '').includes('factorf')
    );
    const ponderacionKey = Object.keys(item).find(key => 
      key.toLowerCase().replace(/\s+/g, '').includes('ponderación') || 
      key.toLowerCase().replace(/\s+/g, '').includes('ponderacion')
    );
    
    // Obtener valores numéricos (defaultear a 0 si no existen o son inválidos)
    const factorF = factorFKey ? parseFloat(item[factorFKey]) || 0 : 0;
    const ponderacionTradicional = ponderacionKey ? parseFloat(item[ponderacionKey]) || 0 : 0;
    
    // Sumar ambos factores
    const suma = factorF + ponderacionTradicional;
    
    // Aplicar lógica de redondeo inteligente con umbral configurable
    const parteEntera = Math.floor(suma);
    const decimal = suma - parteEntera;
    const valorOptimoRedondeado = decimal >= configReglas.factorRedondeo ? 
      parteEntera + 1 : 
      parteEntera;
    
    // Retornar objeto con el nuevo campo agregado
    return {
      ...item,
      'valor optimo redondeado': valorOptimoRedondeado
    };
  }).sort((a, b) => {
    // Ordenar de mayor a menor por valor óptimo redondeado para priorizar productos con mayor potencial
    return b['valor optimo redondeado'] - a['valor optimo redondeado'];
  });
};

/**
 * REGLA 2: CALCULAR VALOR ÓPTIMO RESCATE
 * 
 * "Rescata" SKUs que quedaron con valor 0 en la Regla 1 pero tienen valor en Factor 9 o Factor D.
 * Esta regla evita que productos con potencial queden excluidos del inventario óptimo.
 * 
 * Lógica de rescate:
 * - Si valor_optimo_redondeado = 0 AND (Factor9 ≠ 0 OR FactorD ≠ 0) → aplicar rescate
 * - Prioridad: Factor 9 > Factor D (si ambos tienen valor)
 * - Factores se redondean con Math.round() antes de usar
 * 
 * @param {Array} datos - Array con campo 'valor optimo redondeado' ya calculado
 * @returns {Array} Datos con campos 'valor optimo rescate' y 'valor optimo rescate aplicado'
 */
const calcularValorOptimoRescate = (datos) => {
  return datos.map(item => {
    // Buscar columnas Factor 9 y Factor D de forma flexible
    const factor9Key = Object.keys(item).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      return keyLower.includes('factor9') || keyLower.startsWith('factor9') || keyLower.endsWith('factor9');
    });
    
    const factorDKey = Object.keys(item).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      return keyLower.includes('factord') || keyLower.startsWith('factord') || keyLower.endsWith('factord');
    });
    
    // Obtener valores numéricos
    const factor9 = factor9Key ? parseFloat(item[factor9Key]) || 0 : 0;
    const factorD = factorDKey ? parseFloat(item[factorDKey]) || 0 : 0;
    const valorOptimoRedondeado = item['valor optimo redondeado'] || 0;
    
    // Lógica de rescate: solo si valor_optimo_redondeado = 0
    let valorOptimoRescate = 0;
    let valorOptimoRescateAplicado = valorOptimoRedondeado;
    
    if (valorOptimoRedondeado === 0 && (factor9 > 0 || factorD > 0)) {
      // Prioridad: Factor 9 > Factor D
      if (factor9 > 0) {
        valorOptimoRescate = Math.round(factor9);
      } else if (factorD > 0) {
        valorOptimoRescate = Math.round(factorD);
      }
      
      // Aplicar el rescate
      valorOptimoRescateAplicado = valorOptimoRescate;
    }
    
    return {
      ...item,
      'valor optimo rescate': valorOptimoRescate,
      'valor optimo rescate aplicado': valorOptimoRescateAplicado
    };
  });
};

/**
 * REGLA 3: APLICAR JOROBA
 * 
 * La "joroba" es una optimización que convierte un porcentaje configurable de SKUs
 * con valor = 1 a valor = 2. Esto se basa en la observación de que algunos productos
 * con valor 1 pueden tener potencial para ser 2.
 * 
 * @param {Array} datos - Array con campo 'valor optimo rescate aplicado' ya calculado
 * @param {Object} configReglas - Configuración con porcentaje de joroba
 * @returns {Array} Datos con campo 'valor optimo joroba' agregado
 */
const aplicarJoroba = (datos, configReglas) => {
  // Filtrar SKUs con valor = 1
  const skusConValor1 = datos.filter(item => item['valor optimo rescate aplicado'] === 1);
  
  // Calcular cuántos SKUs cambiar (porcentaje configurable)
  const cantidadACambiar = Math.ceil(skusConValor1.length * (configReglas.joroba / 100));
  
  // Aplicar joroba a los primeros SKUs (ya están ordenados por potencial)
  return datos.map((item, index) => {
    let valorOptimoJoroba = item['valor optimo rescate aplicado'];
    
    // Solo aplicar joroba si el valor actual es 1 y estamos dentro del límite
    if (item['valor optimo rescate aplicado'] === 1 && 
        skusConValor1.indexOf(item) < cantidadACambiar) {
      valorOptimoJoroba = 2;
    }
    
    return {
      ...item,
      'valor optimo joroba': valorOptimoJoroba
    };
  });
};

/**
 * REGLA 4: APLICAR SUB EMPAQUE
 * 
 * El "sub empaque" es una regla especial que detecta productos que terminan en "S"
 * (indicando que son sub empaques) y los reemplaza con el valor del Óptimo Premium.
 * 
 * @param {Array} datos - Array con campo 'valor optimo joroba' ya calculado
 * @returns {Array} Datos con campo 'valor optimo final' agregado
 */
const aplicarSubEmpaque = (datos) => {
  return datos.map(item => {
    // Buscar columna de descripción
    const descripcionKey = Object.keys(item).find(key => 
      key.toLowerCase().replace(/\s+/g, '').includes('descripción') || 
      key.toLowerCase().replace(/\s+/g, '').includes('descripcion')
    );
    
    // Buscar columna Óptimo Premium
    const optimoPremiumKey = Object.keys(item).find(key => 
      key.toLowerCase().replace(/\s+/g, '').includes('óptimo') || 
      key.toLowerCase().replace(/\s+/g, '').includes('optimo')
    );
    
    let valorOptimoFinal = item['valor optimo joroba'];
    
    // Aplicar sub empaque si la descripción termina en "S"
    if (descripcionKey && optimoPremiumKey) {
      const descripcion = String(item[descripcionKey] || '');
      const optimoPremium = parseFloat(item[optimoPremiumKey]) || 0;
      
      if (descripcion.trim().endsWith('S') && optimoPremium > 0) {
        valorOptimoFinal = Math.round(optimoPremium);
      }
    }
    
    return {
      ...item,
      'valor optimo final': valorOptimoFinal
    };
  });
};

/**
 * FUNCIÓN PRINCIPAL: PROCESAR EXCEL CON CONFIGURACIÓN
 * 
 * Esta función ejecuta el algoritmo completo de optimización de inventario
 * aplicando las 4 reglas secuencialmente.
 * 
 * @param {Buffer} fileBuffer - Buffer del archivo Excel
 * @param {Object} customConfig - Configuración personalizada (opcional)
 * @returns {Object} Resultado del procesamiento con resumen final
 */
const procesarExcelConConfig = async (fileBuffer, customConfig = {}) => {
  const startTime = new Date();
  
  try {
    console.log('Iniciando procesamiento de Excel con configuración personalizada...');
    
    // Combinar configuración por defecto con personalizada
    const configReglas = { ...CONFIG_REGLAS_DEFAULT, ...customConfig };
    console.log('Configuración aplicada:', configReglas);
    
    // Leer Excel desde buffer
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const datos = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Datos leídos: ${datos.length} registros`);
    
    if (datos.length === 0) {
      throw new Error('El archivo Excel no contiene datos válidos');
    }
    
    // APLICAR LAS 4 REGLAS SECUENCIALMENTE
    
    // Regla 1: Valor Óptimo Redondeado
    console.log('Aplicando Regla 1: Valor Óptimo Redondeado...');
    let datosProcesados = calcularValorOptimoRedondeado(datos, configReglas);
    
    // Regla 2: Valor Óptimo Rescate
    console.log('Aplicando Regla 2: Valor Óptimo Rescate...');
    datosProcesados = calcularValorOptimoRescate(datosProcesados);
    
    // Regla 3: Joroba
    console.log('Aplicando Regla 3: Joroba...');
    datosProcesados = aplicarJoroba(datosProcesados, configReglas);
    
    // Regla 4: Sub Empaque
    console.log('Aplicando Regla 4: Sub Empaque...');
    datosProcesados = aplicarSubEmpaque(datosProcesados);
    
    // CALCULAR RESUMEN FINAL
    console.log('Calculando resumen final...');
    
    const resumenFinal = {
      registros: datosProcesados.length,
      registrosMayoresACero: datosProcesados.filter(item => item['valor optimo final'] > 0).length,
      sumaTotal: datosProcesados.reduce((sum, item) => sum + (item['valor optimo final'] || 0), 0),
      factorRedondeoEncontrado: configReglas.factorRedondeo,
      diasInversionDeseados: configReglas.diasInversionDeseados,
      diasDeInverionReporteSubido: configReglas.diasDeInverionReporteSubido,
      precioMaximo: configReglas.precioMaximo,
      inversionOriginal: datosProcesados.reduce((sum, item) => {
        const precioKey = Object.keys(item).find(key => 
          key.toLowerCase().replace(/\s+/g, '').includes('precio')
        );
        const precio = precioKey ? parseFloat(item[precioKey]) || 0 : 0;
        return sum + (precio * (item['valor optimo final'] || 0));
      }, 0),
      inversionDeseada: 0, // Se calculará después
      sumaOptimoVentaFinal: 0, // Se calculará después
      tiempoEjecucionMs: 0
    };
    
    // Calcular inversión deseada basada en días objetivo
    resumenFinal.inversionDeseada = resumenFinal.inversionOriginal * (resumenFinal.diasInversionDeseados / resumenFinal.diasDeInverionReporteSubido);
    
    // Calcular suma óptima final
    resumenFinal.sumaOptimoVentaFinal = resumenFinal.sumaTotal;
    
    // Calcular tiempo de ejecución
    const endTime = new Date();
    resumenFinal.tiempoEjecucionMs = endTime - startTime;
    
    console.log('Procesamiento completado exitosamente');
    console.log('Resumen final:', resumenFinal);
    
    return {
      success: true,
      configUsada: configReglas,
      datosProcesados,
      resumenFinal
    };
    
  } catch (error) {
    console.error('Error en procesarExcelConConfig:', error);
    throw error;
  }
};

/**
 * FUNCIÓN LEGACY: PROCESAR EXCEL DESDE ARCHIVO
 * 
 * Mantiene compatibilidad con código existente
 * 
 * @param {string} rutaArchivo - Ruta al archivo Excel
 * @returns {Object} Resultado del procesamiento
 */
const procesarExcel = async (rutaArchivo) => {
  try {
    // Leer archivo desde sistema de archivos
    const fileBuffer = fs.readFileSync(rutaArchivo);
    return await procesarExcelConConfig(fileBuffer);
  } catch (error) {
    console.error('Error en procesarExcel:', error);
    throw error;
  }
};

module.exports = {
  procesarExcel,
  procesarExcelConConfig,
  calcularValorOptimoRedondeado,
  calcularValorOptimoRescate,
  aplicarJoroba,
  aplicarSubEmpaque
};
