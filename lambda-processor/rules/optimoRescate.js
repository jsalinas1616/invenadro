/**
 * REGLA 2: CALCULAR VALOR ÓPTIMO RESCATE
 * 
 * "Rescata" SKUs que quedaron con valor 0 en la Regla 1 pero tienen valor en Factor 9 o Factor D.
 * Esta regla evita que productos con potencial queden excluidos del inventario óptimo.
 * 
 * Lógica de rescate:
 * - Si valor_optimo_redondeado = 0 AND (Factor9 ≠ 0 OR FactorD ≠ 0) → aplicar rescate
 * - Prioridad: Factor 9 > Factor D (si ambos tienen valor)
 * - Factores se redondean con factor de redondeo inteligente antes de usar
 * 
 * @param {Array} datos - Array con campo 'valor optimo redondeado' ya calculado
 * @param {Object} configReglas - Configuración con factor de redondeo
 * @returns {Array} Datos con campos 'valor optimo rescate' y 'valor optimo rescate aplicado'
 */
const calcularValorOptimoRescate = (datos, configReglas) => {
  // Validación estricta: configReglas es obligatorio
  if (!configReglas || typeof configReglas.factorRedondeo !== 'number') {
    throw new Error('RESCATE: configReglas.factorRedondeo es obligatorio y debe ser un número');
  }
  
  const factorRedondeo = configReglas.factorRedondeo;
  
  // Función para aplicar redondeo inteligente solo a la parte decimal
  const aplicarRedondeoInteligente = (valor) => {
    if (valor === 0) return 0;
    
    const parteEntera = Math.floor(valor);
    const parteDecimal = valor - parteEntera;
    
    // Si parte decimal >= factor de redondeo → redondear hacia arriba
    // Si parte decimal < factor de redondeo → redondear hacia abajo  
    return parteDecimal >= factorRedondeo ? parteEntera + 1 : parteEntera;
  };
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
    
    // Obtener valores y aplicar redondeo inteligente con factor de redondeo
    const factor9Original = factor9Key ? parseFloat(item[factor9Key]) || 0 : 0;
    const factorDOriginal = factorDKey ? parseFloat(item[factorDKey]) || 0 : 0;
    
    const factor9Redondeado = aplicarRedondeoInteligente(factor9Original);
    const factorDRedondeado = aplicarRedondeoInteligente(factorDOriginal);
    
    const valorOptimoRedondeado = item['valor optimo redondeado'] || 0;
    
    let valorOptimoRescate;
    let rescateAplicado = false;

    // DEBUG ESPECÍFICO PARA EAN 7501033954412
    const ean = item['EAN/UPC'];
    if (ean == '7501033954412') {
      console.log(`[DEBUG RESCATE EAN 7501033954412] ===== ANÁLISIS COMPLETO =====`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] valor optimo redondeado: ${valorOptimoRedondeado}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] factor9Key encontrado: ${factor9Key}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] factorDKey encontrado: ${factorDKey}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] factor9Original: ${factor9Original}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] factorDOriginal: ${factorDOriginal}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] factor9Redondeado: ${factor9Redondeado}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] factorDRedondeado: ${factorDRedondeado}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] Factor de redondeo usado: ${factorRedondeo}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] Condición rescate: valorOptimoRedondeado === 0? ${valorOptimoRedondeado === 0}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] Condición rescate: factor9Redondeado !== 0? ${factor9Redondeado !== 0}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] Condición rescate: factorDRedondeado !== 0? ${factorDRedondeado !== 0}`);
      console.log(`[DEBUG RESCATE EAN 7501033954412] ¿Aplicará rescate? ${valorOptimoRedondeado === 0 && (factor9Redondeado !== 0 || factorDRedondeado !== 0)}`);
    }
    
    // LÓGICA DE RESCATE: Solo si valor redondeado = 0 y hay algún factor válido
    if (valorOptimoRedondeado === 0 && (factor9Redondeado !== 0 || factorDRedondeado !== 0)) {
      rescateAplicado = true;
      // Factor 9 tiene prioridad sobre Factor D
      if (factor9Redondeado !== 0) {
        valorOptimoRescate = factor9Redondeado;
      } else if (factorDRedondeado !== 0) {
        valorOptimoRescate = factorDRedondeado;
      }
    } else {
      // No aplica rescate, mantener valor original de Regla 1
      valorOptimoRescate = valorOptimoRedondeado;
    }
    
    // Agregar campos de resultado
    return {
      ...item,
      'valor optimo rescate aplicado': rescateAplicado,
      'valor optimo rescate': valorOptimoRescate
    };
  }).sort((a, b) => {
    // Ordenamiento prioritario: valor rescate (descendente) → precio farmacia (descendente)
    const valorA = a['valor optimo rescate'] || 0;
    const valorB = b['valor optimo rescate'] || 0;
    
    if (valorB !== valorA) {
      return valorB - valorA;
    }
    
    // Criterio de desempate: precio farmacia (mayor primero)
    const precioFarmaciaKey = Object.keys(a).find(key => 
      key.toLowerCase().replace(/\s+/g, '').includes('preciofarmacia') ||
      key.toLowerCase().replace(/\s+/g, '').includes('precio') && key.toLowerCase().includes('farmacia')
    );
    
    const precioA = precioFarmaciaKey ? parseFloat(a[precioFarmaciaKey]) || 0 : 0;
    const precioB = precioFarmaciaKey ? parseFloat(b[precioFarmaciaKey]) || 0 : 0;
    
    return precioB - precioA;
  });
};

module.exports = {
  calcularValorOptimoRescate
}; 