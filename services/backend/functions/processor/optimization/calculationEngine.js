/**
 * MOTOR DE CÁLCULO PARA OPTIMIZACIÓN
 * 
 * Contiene las funciones principales para calcular el resultado
 * final con un factor específico de redondeo.
 */

const { calcularValorOptimoRedondeado } = require('../rules/factorRedondeo');
const { calcularValorOptimoRescate } = require('../rules/optimoRescate');
const { reglaOptimoP } = require('../rules/reglaOptimoP');
const { reglaOptimoQ } = require('../rules/reglaOptimoQ');
const { aplicarSubEmpaque } = require('../rules/subEmpaque');
const { aplicarJoroba } = require('../rules/joroba');
const { calcularOptimoVenta, calcularSoloSumaOptimoVenta } = require('../utils/optimoVentaCalculator');

/**
 * CALCULAR SOLO LA SUMA PARA OPTIMIZACIÓN (VERSIÓN LIGERA)
 * 
 * Esta función optimizada solo calcula la suma final para comparar factores,
 * sin generar todas las columnas del resultado final. Esto ahorra mucha memoria.
 * 
 * @param {Array} datos - Dataset completo
 * @param {number} factor - Factor de redondeo específico a probar
 * @param {Object} configReglas - Configuración completa del sistema
 * @param {number} inversionOriginal - Inversión original ya calculada
 * @returns {Object} Solo la suma final y cálculos básicos
 */
const calcularSoloSumaParaOptimizacion = async (datos, factor, configReglas, inversionOriginal = 0) => {
  try {
    // Crear configuración con el factor específico
    const configConFactor = { ...configReglas, factorRedondeo: factor };
    
    // Aplicar solo las reglas necesarias para obtener la suma final
    const datosConValorOptimo = calcularValorOptimoRedondeado(datos, configConFactor);
    const datosConRescate = calcularValorOptimoRescate(datosConValorOptimo, configConFactor);
    const datosConOptimoP = reglaOptimoP(datosConRescate, configConFactor);
    const datosConOptimoQ = reglaOptimoQ(datosConOptimoP, configConFactor);
    
    // SubEmpaque: Ya debería estar en cache (precargado en el flujo principal)
    // Esta llamada será súper rápida porque usa cache
    const datosConSubEmpaque = await aplicarSubEmpaque(datosConOptimoQ);
    
    // Ordenar (necesario para joroba)
    const datosOrdenados = datosConSubEmpaque.sort((a, b) => {
      const valorA = parseFloat(a['sub empaque']) || 0;
      const valorB = parseFloat(b['sub empaque']) || 0;
      
      if (valorB !== valorA) {
        return valorB - valorA;
      }
      
      const precioFarmaciaKey = Object.keys(a).find(key => 
        key.toLowerCase().replace(/\s+/g, '').includes('preciofarmacia') ||
        key.toLowerCase().replace(/\s+/g, '').includes('precio') && key.toLowerCase().includes('farmacia')
      );
      
      const precioA = precioFarmaciaKey ? parseFloat(a[precioFarmaciaKey]) || 0 : 0;
      const precioB = precioFarmaciaKey ? parseFloat(b[precioFarmaciaKey]) || 0 : 0;
      
      return precioB - precioA;
    });
    
    const datosConJoroba = await aplicarJoroba(datosOrdenados, configConFactor);
    
    // OPTIMIZACIÓN ULTRA: Usar función súper rápida que solo calcula la suma
    const sumaOptimioVentaFinal = calcularSoloSumaOptimoVenta(datosConJoroba, configConFactor);
    
    // Calcular inversión deseada
    const inversionDeseadaCalculada = (inversionOriginal / configConFactor.diasDeInverionReporteSubido) * 
      configConFactor.diasInversionDeseados;
    
    // Calcular diferencia absoluta
    const diferencia = Math.abs(inversionDeseadaCalculada - sumaOptimioVentaFinal);
    
    // Liberar memoria de arrays intermedios inmediatamente
    datosConValorOptimo.length = 0;
    datosConRescate.length = 0;
    datosConOptimoP.length = 0;
    datosConOptimoQ.length = 0;
    datosConSubEmpaque.length = 0;
    datosOrdenados.length = 0;
    datosConJoroba.length = 0;
    // datosFinales ya no existe - se optimizó
    
    return {
      factor,
      sumaOptimioVentaFinal,
      inversionDeseadaCalculada,
      diferencia
      // NO devolvemos datosFinales para ahorrar memoria
    };
    
  } catch (error) {
    console.error(`Error calculando suma con factor ${factor}:`, error);
    throw error;
  }
};

/**
 * CALCULAR CON FACTOR ESPECÍFICO
 * 
 * Ejecuta todo el flujo de cálculo con un factor de redondeo específico
 * para obtener el resultado final y poder comparar diferentes factores.
 * 
 * @param {Array} datos - Dataset completo
 * @param {number} factor - Factor de redondeo específico a probar
 * @param {Object} configReglas - Configuración completa del sistema
 * @param {number} inversionOriginal - Inversión original ya calculada
 * @returns {Object} Resultado completo con el factor aplicado
 */
const calcularConFactor = async (datos, factor, configReglas, inversionOriginal = 0) => {
  try {
    // Crear configuración con el factor específico
    const configConFactor = { ...configReglas, factorRedondeo: factor };
    
    // Aplicar todas las reglas en secuencia
    const datosConValorOptimo = calcularValorOptimoRedondeado(datos, configConFactor);
    const datosConRescate = calcularValorOptimoRescate(datosConValorOptimo, configConFactor);
    const datosConOptimoP = reglaOptimoP(datosConRescate, configConFactor);
    const datosConOptimoQ = reglaOptimoQ(datosConOptimoP, configConFactor);
    
    // Aplicar sub empaque primero, luego ordenar, luego joroba
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
    
    const datosConJoroba = await aplicarJoroba(datosConSubEmpaqueOrdenados, configConFactor);
    console.log('🔍 [DEBUG] Datos antes de calcularOptimoVenta:', {
      tipo: typeof datosConJoroba,
      esArray: Array.isArray(datosConJoroba),
      length: datosConJoroba?.length,
      primerosColumnas: datosConJoroba?.[0] ? Object.keys(datosConJoroba[0]).slice(0, 5) : 'N/A'
    });
    const datosFinales = calcularOptimoVenta(datosConJoroba, configConFactor);

    // Calcular estadísticas
    const sumaOptimioVentaFinal = datosFinales.length > 0 ? 
      datosFinales[datosFinales.length - 1]['suma optimo venta'] || 0 : 0;
    
    // DEBUG: Mostrar valores de cálculo de inversión
    console.log('🔍 [OPTIMIZATION DEBUG] === CÁLCULO CON FACTOR', factor, '===');
    console.log('🔍 [OPTIMIZATION DEBUG] Inversión original:', inversionOriginal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    console.log('🔍 [OPTIMIZATION DEBUG] Días reporte subido:', configConFactor.diasDeInverionReporteSubido);
    console.log('🔍 [OPTIMIZATION DEBUG] Días inversión deseados:', configConFactor.diasInversionDeseados);
    
    // Calcular inversión deseada usando la inversión original pasada como parámetro
    const inversionDeseadaCalculada = (inversionOriginal / configConFactor.diasDeInverionReporteSubido) * 
      configConFactor.diasInversionDeseados;
    
    console.log('[OPTIMIZATION DEBUG] Inversión deseada calculada:', inversionDeseadaCalculada.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    console.log('[OPTIMIZATION DEBUG] Suma óptimo venta final:', sumaOptimioVentaFinal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    
    // Calcular diferencia absoluta
    const diferencia = Math.abs(inversionDeseadaCalculada - sumaOptimioVentaFinal);
    console.log('[OPTIMIZATION DEBUG] Diferencia absoluta:', diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    console.log('[OPTIMIZATION DEBUG] === FIN CÁLCULO ===');
    
    return {
      factor,
      sumaOptimioVentaFinal,
      inversionDeseadaCalculada,
      diferencia,
      datosFinales
    };
    
  } catch (error) {
    console.error(`Error calculando con factor ${factor}:`, error);
    throw error;
  }
};

module.exports = {
  calcularConFactor,
  calcularSoloSumaParaOptimizacion
}; 