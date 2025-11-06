/**
 * REGLA 6: APLICAR JOROBA
 * 
 * Regla que ajusta algunos productos con bajo valor óptimo para reforzar el surtido inicial.
 * 
 * Lógica según documento:
 * 1. Filtrar todos los registros donde SubEmpaque sea igual a 1
 * 2. Dentro de ese subconjunto, calcular el 3.5% del total de SKUs
 * 3. De arriba hacia abajo, cambiar los registros que tienen valor de 1 a 2 piezas
 * 
 * @param {Array} datos - Dataset con sub empaque aplicado
 * @param {Object} configReglas - Configuración con porcentaje joroba
 * @returns {Array} Datos con joroba aplicada
 */
const aplicarJoroba = async (datos, configReglas) => {
  // Validación estricta: campos obligatorios
  if (!configReglas) {
    throw new Error('JOROBA: configReglas es obligatorio');
  }
  if (typeof configReglas.diasDeInverionReporteSubido !== 'number') {
    throw new Error('JOROBA: configReglas.diasDeInverionReporteSubido debe ser un número');
  }
  if (typeof configReglas.diasInversionDeseados !== 'number') {
    throw new Error('JOROBA: configReglas.diasInversionDeseados debe ser un número');
  }
  if (typeof configReglas.joroba !== 'number') {
    throw new Error('JOROBA: configReglas.joroba debe ser un número');
  }


  // const controlados = await getControlados({material: '000000000000005934'});
  // console.log('🔍 [JOROBA] Controlados:', controlados);


  // Los datos ya vienen ordenados por valor de sub empaque de mayor a menor
  
  // OPTIMIZACIÓN: Pre-calcular clave de columna precio farmacia
  const precioFarmaciaKey = Object.keys(datos[0] || {}).find(key => 
    key.toLowerCase().replace(/\s+/g, '') === 'preciofarmacia'
  );

  // PRIMERO: Agregar columna "prioridad joroba" = Ctd.UMB × Precio Farmacia
  const datosConPrioridadJoroba = datos.map((item, index) => {
    // Buscar columna Ctd.UMB
    const ctdUmb = parseFloat(item['Ctd.UMB']) || 0;
    
    // Usar clave precalculada
    const precioFarmacia = precioFarmaciaKey ? parseFloat(item[precioFarmaciaKey]) || 0 : 0;
    
    // Calcular prioridad joroba
    const prioridadJoroba = ctdUmb * precioFarmacia;
    
    return {
      ...item,
      originalIndex: index, // Usar index del map (eficiente)
      'prioridad joroba': prioridadJoroba
    };
  });

  // PASO 1: Calcular cuántos productos cambiar (3.5% del TOTAL de productos)
  const totalProductos = datosConPrioridadJoroba.length;
  
  // PASO 2: Calcular base para joroba (productos con sub empaque ≥ 1)
  const productosConSubEmpaqueMayorIgual1 = datosConPrioridadJoroba.filter(item => 
    item['sub empaque'] >= 1
  ).length;
  
  // Calcular cantidad a cambiar (3.5% de productos con sub empaque ≥ 1)
  const cantidadACambiar = Math.round(productosConSubEmpaqueMayorIgual1 * (configReglas.joroba / 100));
  
  console.log(`[JOROBA DEBUG] BASE PARA JOROBA:`);
  console.log(`[JOROBA DEBUG] - Total productos: ${totalProductos}`);
  console.log(`[JOROBA DEBUG] - Productos con sub empaque ≥ 1: ${productosConSubEmpaqueMayorIgual1}`);
  console.log(`[JOROBA DEBUG] - Cantidad a cambiar (${configReglas.joroba}% de ${productosConSubEmpaqueMayorIgual1}): ${cantidadACambiar}`);
  
  // PASO 3: Filtrar solo productos con sub empaque = 1 y excluir tipos específicos
  // REGLA DE NEGOCIO: Excluir Psicotrópicos, Alta Especialidad y Refrigerados
  const tiposExcluidos = [
    // Psicotrópicos
    '22', 'Psicotrópico', '2G', 'Psicotrópico/Genérico',
    // Alta Especialidad  
    '11', 'Especialidad', 'Alta Especialidad',
    // Refrigerados (todos los tipos)
    'R1', 'Refrigerado/Especialidad',
    'RE', 'Refrigerado/Ético Patente', 
    'RD', 'Refrigerado/Dispositivo Médico',
    'RG', 'Refrigerado/Genérico',
    'R2', 'Refrigerado/Psicotrópico',
    'R3', 'Refrigerado/Dermatológico'
  ];
  
  console.log(`[JOROBA DEBUG]  TIPOS EXCLUIDOS:`, tiposExcluidos);
  
  let debugCount = 0;
  const candidatosJoroba = datosConPrioridadJoroba
    .filter(item => {
      // Solo productos con sub empaque = 1 (CANDIDATOS)
      if (item['sub empaque'] !== 1) return false;
      
      // Buscar columna 'Categoría de Material' - PRIORIDAD EXACTA
      const tipoFarmacoKey = Object.keys(item).find(key => {
        const keyLower = key.toLowerCase().replace(/\s+/g, '');
        return key === 'Categoría de Material' ||  // EXACTO PRIMERO
               keyLower === 'categoríadematerial' ||
               keyLower === 'categoriadematerial' ||
               keyLower.includes('categoria') ||     // CATEGORIA ANTES QUE TIPO
               keyLower.includes('tipodefarmaco') || 
               keyLower.includes('tipo') && keyLower.includes('farmaco');
      });
      
      const tipoFarmaco = tipoFarmacoKey ? item[tipoFarmacoKey]?.toString().trim() : '';
      const esExcluido = tiposExcluidos.includes(tipoFarmaco);
      
      // 🔍 DEBUG DETALLADO PARA IDENTIFICAR PROBLEMAS - PRIMEROS 10 PRODUCTOS
      if (debugCount < 10) {
        debugCount++;
        console.log(`[JOROBA DEBUG] PRODUCTO #${debugCount}:`);
        console.log(`[JOROBA DEBUG] - Material: ${item.Material || 'N/A'}`);
        console.log(`[JOROBA DEBUG] - EAN: ${item['EAN/UPC'] || 'N/A'}`);
        console.log(`[JOROBA DEBUG] - Categoría de Material: "${tipoFarmaco}"`);
        console.log(`[JOROBA DEBUG] - Columna encontrada: "${tipoFarmacoKey}"`);
        console.log(`[JOROBA DEBUG] - Está en tiposExcluidos?: ${esExcluido}`);
        console.log(`[JOROBA DEBUG] - Sub empaque: ${item['sub empaque']}`);
        console.log(`[JOROBA DEBUG] - Pasa el filtro?: ${!esExcluido}`);
        console.log(`[JOROBA DEBUG] - Valor original tipoFarmaco:`, item[tipoFarmacoKey]);
        console.log(`[JOROBA DEBUG] - Tipo de tipoFarmaco:`, typeof tipoFarmaco);
      }
      
      // Solo incluir si NO está excluido
      return !esExcluido;
    });
  
  console.log(`[JOROBA DEBUG]  CANDIDATOS JOROBA:`);
  console.log(`[JOROBA DEBUG] - Total productos con sub empaque = 1: ${datosConPrioridadJoroba.filter(item => item['sub empaque'] === 1).length}`);
  console.log(`[JOROBA DEBUG] - Candidatos después de filtros: ${candidatosJoroba.length}`);
  
  // DEBUG: Mostrar algunos candidatos para verificar
  if (candidatosJoroba.length > 0) {
    console.log(`[JOROBA DEBUG]  PRIMEROS 5 CANDIDATOS:`);
    candidatosJoroba.slice(0, 5).forEach((item, index) => {
      const tipoFarmacoKey = Object.keys(item).find(key => key === 'Categoría de Material');
      const tipoFarmaco = tipoFarmacoKey ? item[tipoFarmacoKey]?.toString().trim() : 'N/A';
      console.log(`[JOROBA DEBUG] ${index + 1}. Material: ${item.Material}, Categoría: "${tipoFarmaco}", Sub empaque: ${item['sub empaque']}`);
    });
  }
  
  // PASO 4: ORDENAR candidatos por "prioridad joroba" de MAYOR a MENOR
  candidatosJoroba.sort((a, b) => {
    const prioridadA = parseFloat(a['prioridad joroba']) || 0;
    const prioridadB = parseFloat(b['prioridad joroba']) || 0;
    return prioridadB - prioridadA; // Mayor a menor
  });
  
  // PASO 5: Recorrer candidatos ordenados y aplicar joroba hasta completar cantidadACambiar
  const indicesACambiar = [];
  let productosAplicados = 0;
  
  for (const candidato of candidatosJoroba) {
    if (productosAplicados >= cantidadACambiar) break;
    
    // Buscar precio farmacia
    const precioFarmaciaKey = Object.keys(candidato).find(key => 
      key.toLowerCase().replace(/\s+/g, '') === 'preciofarmacia'
    );
    
    const precioFarmacia = precioFarmaciaKey ? parseFloat(candidato[precioFarmaciaKey]) || 0 : 0;
    
    // Verificar si cumple todos los filtros
    const cumpleFiltros = precioFarmacia <= 1000;
    
    if (cumpleFiltros) {
      // Aplicar joroba y contar
      indicesACambiar.push(candidato.originalIndex);
      productosAplicados++;
    }
  }
  
  // PASO 6: Aplicar la transformación usando valor de sub empaque
  return datosConPrioridadJoroba.map((item, index) => {
    const valorSubEmpaque = item['sub empaque'] || 0;
    let jorobaAplicada = false;
    let valorJoroba = valorSubEmpaque; // Usar valor de sub empaque como base
    
    // Solo aplicar joroba si está en la lista de índices a cambiar
    if (indicesACambiar.includes(index)) {
      jorobaAplicada = true;
      // Cambiar el valor: si era 1, lo convertimos a 2
      if (valorSubEmpaque === 1) {
        valorJoroba = 2;
      }
    }
    
    return {
      ...item,
      'joroba aplicada': jorobaAplicada,
      'joroba': valorJoroba
    };
  });
};

module.exports = {
  aplicarJoroba
}; 