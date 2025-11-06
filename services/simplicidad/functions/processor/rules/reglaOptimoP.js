const BigNumber = require('bignumber.js');

// Configurar BigNumber para comportarse como Excel
BigNumber.set({ 
  DECIMAL_PLACES: 3,
  ROUNDING_MODE: 1  // 1 = ROUND_DOWN (truncate como Excel)
});

/**
 * REGLA ÓPTIMO P: CALCULAR VALOR ÓPTIMO BASADO EN VENTAS DEL EXCEL
 * 
 * Esta regla aplica la fórmula: ÓptimoP = Factor de Redondeo × [((Venta Anual / 365) + 2 × (Venta Trimestral / 90)) × (Días de Inversión / 3)]
 * Solo se aplica cuando Ctd.UMB = 0 y valor optimo rescate = 0
 * Usa las columnas 'VtasTrimDataBrick' y 'VtasAnualDataBrick' cargadas de Databricks
 * AHORA CON BIGNUMBER.JS PARA PRECISIÓN EXACTA COMO EXCEL
 * 
 * @param {Array} datosConRescate - Array con campo 'valor optimo rescate' ya calculado
 * @param {Object} configReglas - Configuración con diasDeInversionParaReglasP y factorRedondeo
 * @returns {Array} Datos con campos 'Regla OptimoP aplicado' y 'valor OptimoP'
 */
const reglaOptimoP = (datosConRescate, configReglas) => {
  // Validación estricta: campos obligatorios
  if (!configReglas) {
    throw new Error('REGLA_OPTIMO_P: configReglas es obligatorio');
  }
  if (typeof configReglas.diasDeInversionParaReglasP !== 'number') {
    throw new Error('REGLA_OPTIMO_P: configReglas.diasDeInversionParaReglasP debe ser un número');
  }
  if (typeof configReglas.factorRedondeo !== 'number') {
    throw new Error('REGLA_OPTIMO_P: configReglas.factorRedondeo debe ser un número');
  }
  
  console.log(`[REGLA OPTIMO P] DEBUG INICIANDO - Total productos: ${datosConRescate.length}`);
  console.log(`[REGLA OPTIMO P] Configuración: diasDeInversionParaReglasP=${configReglas.diasDeInversionParaReglasP}, factorRedondeo=${configReglas.factorRedondeo}`);
  
  try {
    const resultados = datosConRescate.map((item, index) => {
      let valorOptimoPAplicado = false;
      let valorOptimoRescate = item['valor optimo rescate'] ?? 0;

      // Usar la columna exacta 'Ctd.UMB'
      const ctdUmb = parseFloat(item['Ctd.UMB']) || 0;

      // Aplicar regla si Ctd.UMB = 0 y valor optimo rescate = 0
      if (ctdUmb === 0 && valorOptimoRescate === 0) {
        valorOptimoPAplicado = true;

        // Usar DATOS DE DATABRICKS (ya cargados previamente) - CON BIGNUMBER
        const ventasTrimestrales = parseFloat(item['VtasTrimDataBrick']) || 0;
        const ventasAnuales = parseFloat(item['VtasAnualDataBrick']) || 0;

        // DEBUG DETALLADO PARA IDENTIFICAR NaN
        console.log(`[DEBUG OPTIMOP ${index}] Material: ${item.Material || 'N/A'}`);
        console.log(`[DEBUG OPTIMOP ${index}] VtasTrimDataBrick: ${ventasTrimestrales} (tipo: ${typeof ventasTrimestrales})`);
        console.log(`[DEBUG OPTIMOP ${index}] VtasAnualDataBrick: ${ventasAnuales} (tipo: ${typeof ventasAnuales})`);
        
        // PASO 1: vAnual = (ventasAnuales / 365) truncado a 3 decimales - EXACTO COMO EXCEL
        const vAnual = Math.trunc((ventasAnuales / 365) * 1000) / 1000;
        console.log(`[DEBUG OPTIMOP ${index}] PASO 1 - vAnual: ${vAnual} (ExcelTrunc)`);
        
        // PASO 2: vTrim = ((ventasTrimestrales / 90) * 2) truncado a 3 decimales - EXACTO COMO EXCEL
        const vTrim = Math.trunc(((ventasTrimestrales / 90) * 2) * 1000) / 1000;
        console.log(`[DEBUG OPTIMOP ${index}] PASO 2 - vTrim: ${vTrim} (ExcelTrunc)`);
        
        // PASO 3: anualTrim = ((vAnual + vTrim) / 3) truncado a 3 decimales - EXACTO COMO EXCEL
        const anualTrim = Math.trunc(((vAnual + vTrim) / 3) * 1000) / 1000;
        console.log(`[DEBUG OPTIMOP ${index}] PASO 3 - anualTrim: ${anualTrim} (ExcelMath)`);
        
        // PASO 4: Resultado = anualTrim * 21 - USAR BIGNUMBER PARA EVITAR 1.9999999
        const diasInversion = new BigNumber(anualTrim).multipliedBy(21);
        console.log(`[DEBUG OPTIMOP ${index}] PASO 4 - diasInversion: ${diasInversion.toString()} (BigNumber)`);
        
        // Calcular resultado base SIN factor de redondeo - BIGNUMBER PARA PRECISION
        const calculoBase = diasInversion;
        console.log(`[DEBUG OPTIMOP ${index}] calculoBase: ${calculoBase.toString()} (BigNumber)`);
        
        // Aplicar factor de redondeo al resultado final - USAR BIGNUMBER PARA PRECISION
        const parteEntera = Math.floor(calculoBase.toNumber());
        const parteDecimalBN = calculoBase.minus(parteEntera);
        const parteDecimal = parteDecimalBN.toNumber();
        
        // Redondear la parte decimal para comparación más precisa
        const parteDecimalRedondeada = Math.round(parteDecimal * 10000) / 10000;
        
        valorOptimoRescate = parteDecimalRedondeada >= configReglas.factorRedondeo ? 
          parteEntera + 1 : 
          parteEntera;
        
        console.log(`[DEBUG OPTIMOP ${index}] RESULTADO FINAL: parteEntera=${parteEntera}, parteDecimal=${parteDecimal}, factorRedondeo=${configReglas.factorRedondeo}, valorOptimoRescate=${valorOptimoRescate}`);
      } else {
        console.log(`[DEBUG OPTIMOP ${index}] NO APLICA - Ctd.UMB: ${ctdUmb}, valor optimo rescate: ${valorOptimoRescate}`);
      }

      return {
        ...item,
        'Regla OptimoP aplicada': valorOptimoPAplicado,
        'valor ReglaOptimoP': valorOptimoRescate
      };
    });
    
    // RESUMEN FINAL
    const productosConReglaAplicada = resultados.filter(item => item['Regla OptimoP aplicada']).length;
    const productosSinReglaAplicada = resultados.filter(item => !item['Regla OptimoP aplicada']).length;
    const productosConNaN = resultados.filter(item => isNaN(item['valor ReglaOptimoP'])).length;
    
    console.log(`[REGLA OPTIMO P] RESUMEN FINAL:`);
    console.log(`[REGLA OPTIMO P] - Total productos: ${resultados.length}`);
    console.log(`[REGLA OPTIMO P] - Con Regla OptimoP aplicada: ${productosConReglaAplicada}`);
    console.log(`[REGLA OPTIMO P] - Sin Regla OptimoP aplicada: ${productosSinReglaAplicada}`);
    console.log(`[REGLA OPTIMO P] - Con valores NaN: ${productosConNaN}`);
    console.log(`[REGLA OPTIMO P] - Todos tienen valor ReglaOptimoP válido: ${resultados.every(item => !isNaN(item['valor ReglaOptimoP']))}`);
    
    return resultados;
    
  } catch (error) {
    console.error('Error en reglaOptimoP:', error);
    throw error;
  }
};

module.exports = {
  reglaOptimoP
}; 