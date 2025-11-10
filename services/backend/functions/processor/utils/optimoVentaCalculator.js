/**
 * CALCULAR SOLO SUMA ÓPTIMO VENTA (VERSIÓN ULTRA LIGERA PARA BÚSQUEDA)
 * 
 * Version optimizada que solo calcula la suma final sin generar arrays intermedios.
 * Específicamente diseñada para la búsqueda binaria de factores.
 * 
 * @param {Array} datos - Dataset con todas las reglas aplicadas
 * @param {Object} configReglas - Configuración del sistema
 * @returns {number} Solo la suma final
 */
const calcularSoloSumaOptimoVenta = (datos, configReglas) => {
  if (!configReglas || typeof configReglas.precioMaximo !== 'number') {
    return 0;
  }
  
  let sumaFinal = 0;
  const precioMaximo = configReglas.precioMaximo;
  
  for (let i = 0; i < datos.length; i++) {
    const item = datos[i];
    const valorSubEmpaque = item['joroba'] || 0;
    
    // Búsqueda rápida de precio (optimizada para velocidad)
    let precioFarmacia = 0;
    if (item['Precio Farmacia']) {
      precioFarmacia = parseFloat(item['Precio Farmacia']) || 0;
    } else if (item['precio farmacia']) {
      precioFarmacia = parseFloat(item['precio farmacia']) || 0;
    } else if (item['Precio']) {
      precioFarmacia = parseFloat(item['Precio']) || 0;
    } else {
      // Fallback: buscar cualquier columna de precio (más lento)
      for (const key in item) {
        const keyLower = key.toLowerCase().replace(/\s+/g, '');
        if (keyLower.includes('precio')) {
          precioFarmacia = parseFloat(item[key]) || 0;
          break;
        }
      }
    }
    
    // Calcular óptimo venta solo si cumple restricciones
    if (precioFarmacia > 0 && precioFarmacia <= precioMaximo) {
      sumaFinal += valorSubEmpaque * precioFarmacia;
    }
  }
  
  return sumaFinal;
};

/**
 * CALCULAR ÓPTIMO VENTA FINAL
 * 
 * Calcula el valor óptimo de venta final para cada producto y la suma acumulada.
 * Esta es la última etapa del procesamiento donde se calculan los valores finales.
 * 
 * @param {Array} datos - Dataset con todas las reglas aplicadas
 * @param {Object} configReglas - Configuración del sistema
 * @returns {Array} Datos con óptimo venta calculado
 */
const calcularOptimoVenta = (datos, configReglas) => {
  // Validación estricta: campos obligatorios
  if (!configReglas) {
    throw new Error('OPTIMO_VENTA: configReglas es obligatorio');
  }
  if (typeof configReglas.precioMaximo !== 'number') {
    throw new Error('OPTIMO_VENTA: configReglas.precioMaximo debe ser un número');
  }
  let sumaAcumulativa = 0;
  
  return datos.map(item => {
    // Buscar columna de precio con flexibilidad en nombres
    const precioFarmaciaKey = Object.keys(item).find(key => {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      return keyLower.includes('preciofarmacia') ||
             keyLower.includes('precio') && keyLower.includes('farmacia') ||
             keyLower.includes('preciocompra') ||
             keyLower.includes('precio');
    });
    
    const valorSubEmpaque = item['joroba'] || 0;
    const precioFarmacia = precioFarmaciaKey ? parseFloat(item[precioFarmaciaKey]) || 0 : 0;
    
    // CALCULAR VALOR MONETARIO: cantidad × precio unitario
    let optimoVenta = 0;
    
    // Aplicar restricciones de precio para filtrar productos válidos
    if (precioFarmacia > 0 && precioFarmacia <= configReglas.precioMaximo) {
      optimoVenta = valorSubEmpaque * precioFarmacia;
    }
    
    // Mantener suma progresiva para análisis de inversión acumulativa
    sumaAcumulativa += optimoVenta;
    
    return {
      ...item,
      'optimo venta': optimoVenta,
      'suma optimo venta': sumaAcumulativa
    };
  });
};

module.exports = {
  calcularOptimoVenta,
  calcularSoloSumaOptimoVenta
}; 