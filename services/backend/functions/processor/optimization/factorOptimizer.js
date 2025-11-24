const { calcularSoloSumaParaOptimizacion } = require('./calculationEngine');

/**
 * OPTIMIZADOR DE FACTOR DE REDONDEO - BÚSQUEDA TERNARIA MATEMÁTICA
 * 
 * Utiliza búsqueda ternaria para encontrar el factor de redondeo óptimo de manera matemáticamente eficiente.
 * La búsqueda ternaria garantiza encontrar el mínimo global en O(log n) iteraciones.
 * 
 * Lógica del algoritmo:
 * - Si suma > inversión deseada → SUBIR factor (menos productos)
 * - Si suma < inversión deseada → BAJAR factor (más productos)
 * - Mejor quedarse por debajo que pasarse del objetivo
 * 
 * @param {Array} datos - Dataset completo de inventario
 * @param {number} factorInicial - Factor de partida para la optimización
 * @param {Object} configReglas - Configuración completa del sistema
 * @param {number} inversionOriginal - Inversión original ya calculada
 * @returns {Object} Resultado con factor óptimo y datos procesados
 */
const optimizarFactorRedondeo = async (datos, factorInicial, configReglas, inversionOriginal = 0) => {
  
  //CONFIGURACIÓN DE BÚSQUEDA (AJUSTABLE)
  const EXPANSION_ARRIBA = 0.15;  // +15 puntos arriba del factor inicial
  const EXPANSION_ABAJO = 0.05;   // -5ntos pu abajo del factor inicial
  const PRECISION_BUSQUEDA = 0.01; // Precisión de búsqueda (puntos)
  
  //LOGS DETALLADOS DE ENTRADA
  console.log(`[OPTIMIZATION] ===== INICIO OPTIMIZACIÓN TERNARIA =====`);
  console.log(`[OPTIMIZATION] Factor recibido del FRONTEND: ${factorInicial}`);
  console.log(`[OPTIMIZATION] Config completa recibida:`, {
    factorRedondeo: configReglas.factorRedondeo,
    joroba: configReglas.joroba,
    diasInversionDeseados: configReglas.diasInversionDeseados,
    precioMaximo: configReglas.precioMaximo
  });
  console.log(`[OPTIMIZATION] Inversión original: ${inversionOriginal}`);
  console.log(`[OPTIMIZATION] Total registros a procesar: ${datos.length}`);
  console.log(`[OPTIMIZATION] Rango a explorar: [${(factorInicial - EXPANSION_ABAJO).toFixed(2)}, ${(factorInicial + EXPANSION_ARRIBA).toFixed(2)}]`);
  
  console.log(`[OPTIMIZATION] Calculando línea base con factor inicial ${factorInicial}...`);
  const tiempoInicio = Date.now();
  
  // Establecer línea base con el factor inicial (versión ligera)
  const resultadoInicialTemp = await calcularSoloSumaParaOptimizacion(datos, factorInicial, configReglas, inversionOriginal);
  
  const tiempoLineaBase = Date.now() - tiempoInicio;
  console.log(`[OPTIMIZATION] Línea base completada en ${tiempoLineaBase}ms (~${Math.round(tiempoLineaBase/1000)}s)`);
  
  const inversionDeseada = resultadoInicialTemp.inversionDeseadaCalculada;
  let mejorGlobal = null;
  let diferenciaGlobal = Infinity;
  
  console.log(`[OPTIMIZATION] Iniciando algoritmo hibrido expansivo con factor inicial: ${factorInicial}`);
  console.log(`[OPTIMIZATION] Rango optimizado: +${EXPANSION_ARRIBA} arriba, -${EXPANSION_ABAJO} abajo`);
  console.log(`[OPTIMIZATION] Target objetivo de inversion: ${inversionDeseada.toFixed(2)}`);
  
  // ALGORITMO HÍBRIDO EXPANSIVO
  let rangoMin = Math.max(0.05, factorInicial - EXPANSION_ABAJO);
  let rangoMax = Math.min(0.95, factorInicial + EXPANSION_ARRIBA);
  
  console.log(`[TERNARY] ===== CONFIGURACIÓN RANGO BÚSQUEDA =====`);
  console.log(`[TERNARY] Factor INPUT del frontend: ${factorInicial}`);
  console.log(`[TERNARY] Expansión arriba: +${EXPANSION_ARRIBA} = ${factorInicial} + ${EXPANSION_ARRIBA} = ${(factorInicial + EXPANSION_ARRIBA).toFixed(2)}`);
  console.log(`[TERNARY] Expansión abajo: -${EXPANSION_ABAJO} = ${factorInicial} - ${EXPANSION_ABAJO} = ${(factorInicial - EXPANSION_ABAJO).toFixed(2)}`);
  console.log(`[TERNARY] Rango FINAL: [${rangoMin.toFixed(2)}, ${rangoMax.toFixed(2)}]`);
  console.log(`[TERNARY] Total factores posibles: ${Math.ceil((rangoMax - rangoMin) / PRECISION_BUSQUEDA)} (método lineal)`);
  
  // Función auxiliar para encontrar el mejor de una lista de resultados
  const encontrarMejor = (resultados) => {
    return resultados.reduce((best, current) => {
      const diferenciaActual = Math.abs(current.sumaOptimioVentaFinal - inversionDeseada);
      const diferenciaMejor = best ? Math.abs(best.sumaOptimioVentaFinal - inversionDeseada) : Infinity;
      return diferenciaActual < diferenciaMejor ? current : best;
    }, null);
  };
  
  // 🎯 BÚSQUEDA TERNARIA MATEMÁTICAMENTE ÓPTIMA
  console.log(`[TERNARY] Iniciando búsqueda ternaria matemática en rango [${rangoMin.toFixed(2)}, ${rangoMax.toFixed(2)}]`);
  
  let left = rangoMin;
  let right = rangoMax;
  let iteraciones = 0;
  mejorGlobal = null;
  diferenciaGlobal = Infinity;
  
  // Función para evaluar un factor y retornar la diferencia al objetivo
  const evaluarFactor = async (factor) => {
    iteraciones++;
    const resultado = await calcularSoloSumaParaOptimizacion(datos, factor, configReglas, inversionOriginal);
    const diferencia = Math.abs(resultado.sumaOptimioVentaFinal - inversionDeseada);
    
    // Actualizar mejor global si es necesario
    if (diferencia < diferenciaGlobal) {
      mejorGlobal = resultado;
      diferenciaGlobal = diferencia;
      console.log(`[TERNARY] Nuevo óptimo: factor ${factor} con diferencia ${diferencia.toFixed(2)}`);
    }
    
    return { factor, diferencia, resultado };
  };
  
  // Búsqueda ternaria: dividir en 3 secciones y encontrar el mínimo
  while (right - left > PRECISION_BUSQUEDA) {
    // Calcular los dos puntos internos (golden ratio para eficiencia)
    const third = (right - left) / 3;
    const mid1 = Math.round((left + third) * 100) / 100;
    const mid2 = Math.round((right - third) * 100) / 100;
    
    // PROTECCIÓN ANTI-LOOP: Si los puntos son iguales, salir
    if (mid1 >= mid2 || mid1 === left || mid2 === right) {
      console.log(`[TERNARY] Convergencia alcanzada: puntos coinciden [${left}, ${right}]`);
      break;
    }
    
    console.log(`[TERNARY] Evaluando rango [${left.toFixed(2)}, ${right.toFixed(2)}] - puntos: ${mid1}, ${mid2}`);
    
    // Evaluar ambos puntos en paralelo
    const [eval1, eval2] = await Promise.all([
      evaluarFactor(mid1),
      evaluarFactor(mid2)
    ]);
    
    console.log(`[TERNARY] Evaluando rango [${left.toFixed(2)}, ${right.toFixed(2)}] - puntos: ${mid1}, ${mid2}`);
    
    // Decidir qué tercio eliminar basado en cuál punto es mejor
    if (eval1.diferencia <= eval2.diferencia) {
      // El mínimo está en la mitad izquierda o centro
      right = mid2;
      console.log(`[TERNARY] Eliminando tercio derecho, nuevo rango: [${left.toFixed(2)}, ${right.toFixed(2)}]`);
    } else {
      // El mínimo está en la mitad derecha o centro  
      left = mid1;
      console.log(`[TERNARY] Eliminando tercio izquierdo, nuevo rango: [${left.toFixed(2)}, ${right.toFixed(2)}]`);
    }
  }
  
  // Evaluación final del punto medio restante para garantizar precisión
  const factorFinal = Math.round(((left + right) / 2) * 100) / 100;
  await evaluarFactor(factorFinal);
  
  console.log(`[TERNARY] Búsqueda ternaria completada en ${iteraciones} iteraciones (vs ${Math.ceil((rangoMax - rangoMin) / PRECISION_BUSQUEDA)} lineales)`);
  console.log(`[TERNARY] Factor MATEMÁTICAMENTE óptimo: ${mejorGlobal.factor} con diferencia ${diferenciaGlobal.toFixed(2)}`);
  
  // Asignar resultado final de la búsqueda ternaria
  let mejorFactor = mejorGlobal.factor;
  
  // 🔍 LOGS DETALLADOS DE RESULTADO
  console.log(`[TERNARY] ===== RESULTADO FINAL OPTIMIZACIÓN =====`);
  console.log(`[TERNARY] Factor INICIAL (del frontend): ${factorInicial}`);
  console.log(`[TERNARY] Factor ÓPTIMO encontrado: ${mejorFactor}`);
  console.log(`[TERNARY] Diferencia numérica: ${mejorFactor - factorInicial > 0 ? '+' : ''}${(mejorFactor - factorInicial).toFixed(2)}`);
  console.log(`[TERNARY] Diferencia monetaria: ${diferenciaGlobal.toFixed(2)}`);
  console.log(`[TERNARY] Iteraciones usadas: ${iteraciones} (eficiencia matemática)`);
  console.log(`[TERNARY] ===== FIN OPTIMIZACIÓN TERNARIA =====`);
  
  // PASO 2: RETORNAR FACTOR ÓPTIMO (el flujo principal se encarga del resto)
  console.log(`[TERNARY] Factor óptimo encontrado: ${mejorFactor}`);
  
  // Retornar solo el factor óptimo - el flujo principal manejará el resto
  return {
    factor: mejorFactor,
    factorOptimo: mejorFactor,
    factorOriginal: factorInicial,
    iteracionesRealizadas: iteraciones,
    diferenciaOptima: diferenciaGlobal,
    algoritmo: 'busqueda_ternaria_matematica',
    sumaOptimioVentaFinal: mejorGlobal.sumaOptimioVentaFinal,
    inversionDeseadaCalculada: mejorGlobal.inversionDeseadaCalculada,
    diferencia: mejorGlobal.diferencia
  };
};

module.exports = {
  optimizarFactorRedondeo
};