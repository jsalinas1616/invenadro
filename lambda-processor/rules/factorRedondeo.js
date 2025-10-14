/**
 * REGLA 1: CALCULAR VALOR ÓPTIMO REDONDEADO
 * 
 * Aplica el factor de redondeo inteligente a los valores óptimos calculados.
 * 
 * Lógica de redondeo:
 * - Si el decimal es >= factorRedondeo → redondear hacia arriba
 * - Si el decimal es < factorRedondeo → redondear hacia abajo
 * 
 * Ejemplo con factorRedondeo = 0.47:
 * - 1.47 → 2 (decimal 0.47 >= 0.47)
 * - 1.46 → 1 (decimal 0.46 < 0.47)
 * 
 * @param {Array} datos - Dataset con valores óptimos sin redondear
 * @param {Object} configReglas - Configuración con factorRedondeo
 * @returns {Array} Datos con valores óptimos redondeados
 */
const calcularValorOptimoRedondeado = (datos, configReglas) => {


  // FUNCIÓN TRUNCATE (agregar al inicio)
  function truncateToDecimals(num, decimals) {
  const factor = Math.pow(10, decimals);
  // Agregar pequeña tolerancia para manejar errores de precisión específicos
  const adjusted = num + 1e-10; // Tolerancia muy pequeña
  return Math.trunc(adjusted * factor) / factor;
}

  

  // Validación estricta: campos obligatorios
  if (!configReglas) {
    throw new Error('FACTOR_REDONDEO: configReglas es obligatorio');
  }
  if (typeof configReglas.factorRedondeo !== 'number') {
    throw new Error('FACTOR_REDONDEO: configReglas.factorRedondeo debe ser un número');
  }

  const resultados = datos.map(item => {
    // Extraer valores necesarios
    const factorF = parseFloat(item['Factor F']) || 0;
    const ponderacionTradicional = parseFloat(item['Ponderación Tradicional']) || 0;
    const factor9 = parseFloat(item['Factor 9']) || 0;
    const factorD = parseFloat(item['Factor D']) || 0;
    
    // Aplicar lógica correcta según el documento
    let valorOptimoSinRedondeado;
    if (factorF === 0) {
      valorOptimoSinRedondeado = factor9;
    } else if (ponderacionTradicional === 0) {
      valorOptimoSinRedondeado = factorD;
    } else {
      valorOptimoSinRedondeado = factorF + ponderacionTradicional;
    }
    

    
    // IMPORTANTE: Redondear la suma a 2 decimales ANTES de aplicar el factor de redondeo

    // dice bairon que no aplica 3.428 debe de quedarse como 3.42 no como  3.43 como lo haria
    // valorOptimoSinRedondeado = parseFloat(valorOptimoSinRedondeado.toFixed(2));

  
  
    // Aplicar redondeo
    const parteEntera = Math.floor(valorOptimoSinRedondeado);
    const decimal = truncateToDecimals(valorOptimoSinRedondeado - parteEntera,2);

    let valorOptimoRedondeado;
    if (decimal >= configReglas.factorRedondeo) {
      valorOptimoRedondeado = parteEntera + 1; // Redondear hacia arriba
    } else {
      valorOptimoRedondeado = parteEntera; // Redondear hacia abajo
    }
    return {
      ...item,
      'valor optimo redondeado': valorOptimoRedondeado
    };
  });
  
  // Ordenar de mayor a menor por valor óptimo redondeado
  return resultados.sort((a, b) => {
    return b['valor optimo redondeado'] - a['valor optimo redondeado'];
  });
};

module.exports = {
  calcularValorOptimoRedondeado
}; 