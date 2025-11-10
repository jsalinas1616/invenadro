/**
 * REGLA ÓPTIMO Q: CALCULAR VALOR ÓPTIMO BASADO EN DATOS DE DATABRICKS
 * 
 * Esta regla se aplica después de reglaOptimoP y puede modificar o mantener los valores
 * Si aplica la regla: calcula nuevo valor usando datos de Databricks
 * Si NO aplica: arrastra el valor de 'valor ReglaOptimoP'
 * 
 * @param {Array} datosConOptimoP - Array con campos 'Regla OptimoP aplicada' y 'valor ReglaOptimoP' ya calculados
 * @param {Object} configReglas - Configuración con mostrador y otros parámetros
 * @returns {Array} Datos con campos 'Regla OptimoQ aplicada' y 'valor ReglaOptimoQ'
 */
const reglaOptimoQ = (datosConOptimoP, configReglas) => {
  console.log(`[REGLA OPTIMO Q] 🚀 DEBUG INICIANDO - Total productos: ${datosConOptimoP.length}`);
  
  // Validación estricta: configReglas obligatorio (consistencia)
  if (!configReglas) {
    throw new Error('REGLA_OPTIMO_Q: configReglas es obligatorio');
  }
  try {
    const resultados = datosConOptimoP.map(item => {
      let valorOptimoQAplicado = false;
      let valorOptimoQ = item['valor ReglaOptimoP'] ?? 0; // Por defecto arrastra el valor de OptimoP

      // 🎯 LÓGICA ESPECÍFICA DE LA REGLA OPTIMOQ
      // Criterios: valor ReglaOptimoP = 0 Y Venta Neta Trimestral > 1 (según documento)
      const ventaTrimestralDatabricks = parseFloat(item['VtasTrimDataBrick']) || 0;

      // 🎯 LÓGICA CORRECTA DE LA REGLA OPTIMOQ
      // Criterio: valor ReglaOptimoP = 0 Y VtasTrimDataBrick >= 2
      if (item['valor ReglaOptimoP'] === 0 && ventaTrimestralDatabricks >= 2) {
        valorOptimoQAplicado = true;
        valorOptimoQ = 1;
        
        console.log(`[REGLA OPTIMO Q] ✅ APLICADA - Material: ${item.Material}, EAN: ${item['EAN/UPC']}, OptimoP: ${item['valor ReglaOptimoP']}, VentaTrim: ${ventaTrimestralDatabricks}`);
      }

      return {
        ...item,
        'Regla OptimoQ aplicada': valorOptimoQAplicado,
        'valor ReglaOptimoQ': valorOptimoQ
      };
    });
    
    // Contar productos procesados
    const productosConReglaAplicada = resultados.filter(item => item['Regla OptimoQ aplicada']).length;
    const productosSinReglaAplicada = resultados.filter(item => !item['Regla OptimoQ aplicada']).length;
    
    console.log(`[REGLA OPTIMO Q] 📊 RESUMEN:`);
    console.log(`[REGLA OPTIMO Q] - Total productos: ${resultados.length}`);
    console.log(`[REGLA OPTIMO Q] - Con Regla OptimoQ aplicada: ${productosConReglaAplicada}`);
    console.log(`[REGLA OPTIMO Q] - Sin Regla OptimoQ aplicada: ${productosSinReglaAplicada}`);
    console.log(`[REGLA OPTIMO Q] - Todos tienen valor ReglaOptimoQ: ${resultados.every(item => item['valor ReglaOptimoQ'] !== undefined)}`);
    
    // Ordenar de mayor a menor después de aplicar regla OptimoQ (consistente con punto 2)
    return resultados.sort((a, b) => {
      // Ordenamiento prioritario: valor ReglaOptimoQ (descendente) → precio farmacia (descendente)
      const valorA = a['valor ReglaOptimoQ'] || 0;
      const valorB = b['valor ReglaOptimoQ'] || 0;
      
      if (valorB !== valorA) {
        return valorB - valorA;  // Mayor a menor por valor ReglaOptimoQ
      }
      
      // Criterio de desempate: precio farmacia (mayor primero)
      const precioFarmaciaKey = Object.keys(a).find(key => 
        key.toLowerCase().replace(/\s+/g, '').includes('preciofarmacia') ||
        key.toLowerCase().replace(/\s+/g, '').includes('precio') && key.toLowerCase().includes('farmacia')
      );
      
      const precioA = precioFarmaciaKey ? parseFloat(a[precioFarmaciaKey]) || 0 : 0;
      const precioB = precioFarmaciaKey ? parseFloat(b[precioFarmaciaKey]) || 0 : 0;
      
      return precioB - precioA;  // Mayor a menor por precio farmacia
    });
    
  } catch (error) {
    console.error('Error en reglaOptimoQ:', error);
    throw error;
  }
};

module.exports = {
  reglaOptimoQ
}; 