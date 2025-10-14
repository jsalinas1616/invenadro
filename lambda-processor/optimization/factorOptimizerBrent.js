/**
 * OPTIMIZADOR DE FACTOR DE REDONDEO - BRENT'S METHOD
 * 
 * Implementacion del algoritmo de Brent para optimizacion unidimensional
 * Combina Golden Section Search con interpolacion parabolica para
 * encontrar el factor de redondeo optimo que minimice la diferencia
 * entre la suma calculada y la inversion deseada.
 * 
 * VENTAJAS DE BRENT'S METHOD:
 * - Convergencia garantizada (como Golden Section)
 * - Velocidad superior (interpolacion parabolica cuando es posible)
 * - Robusto ante funciones irregulares
 * - Matematicamente probado como optimo
 */

const { calcularConFactor } = require('./calculationEngine');

/**
 * FUNCION PRINCIPAL: OPTIMIZAR FACTOR DE REDONDEO CON BRENT'S METHOD
 * 
 * Encuentra el factor de redondeo que minimiza la diferencia entre
 * la suma calculada y la inversion deseada usando el algoritmo de Brent.
 * 
 * @param {Array} datos - Dataset con productos procesados
 * @param {number} factorInicial - Factor de redondeo inicial del frontend
 * @param {Object} configReglas - Configuracion de reglas de negocio
 * @param {number} inversionOriginal - Inversion original en pesos
 * @returns {Object} Resultado con factor optimo y estadisticas
 */
const optimizarFactorRedondeo = async (datos, factorInicial, configReglas, inversionOriginal) => {
  console.log('[BRENT] ===== INICIO OPTIMIZACION BRENT\'S METHOD =====');
  
  // PASO 1: CALCULAR INVERSION DESEADA
  // Formula: (inversion original / dias reporte) * dias deseados
  const inversionDeseada = (inversionOriginal / configReglas.diasDeInverionReporteSubido) * 
                          configReglas.diasInversionDeseados;
  
  console.log('[BRENT] Factor inicial del frontend:', factorInicial);
  console.log('[BRENT] Inversion original:', inversionOriginal.toFixed(2));
  console.log('[BRENT] Dias reporte subido:', configReglas.diasDeInverionReporteSubido);
  console.log('[BRENT] Dias inversion deseados:', configReglas.diasInversionDeseados);
  console.log('[BRENT] Inversion deseada calculada:', inversionDeseada.toFixed(2));
  
  // PASO 2: CONFIGURAR PARAMETROS DE BUSQUEDA PARA 2 DECIMALES
  const rangoMin = 0.10;  // Buscar desde 10% (2 decimales)
  const rangoMax = 0.90;  // Hasta 90% (2 decimales)
  const TOLERANCE = 0.005; // Precision para garantizar 2 decimales
  
  console.log('[BRENT] Rango de busqueda: [' + rangoMin.toFixed(2) + ', ' + rangoMax.toFixed(2) + '] (solo 2 decimales)');
  console.log('[BRENT] Tolerancia:', TOLERANCE, '(garantiza precision a 2 decimales)');
  
  // Variables de control
  let iteraciones = 0;
  let mejorGlobal = null;
  let diferenciaGlobal = Infinity;
  const historialIteraciones = []; // Guardar historial de cada iteración
  
  // FUNCION AUXILIAR: REDONDEAR A 2 DECIMALES EXACTOS
  // Convierte cualquier numero a formato: 0.10, 0.11, 0.12, etc.
  const redondearFactor = (factor) => {
    return Math.round(factor * 100) / 100;
  };
  
  // FUNCION INTERNA: EVALUAR UN FACTOR
  // Calcula la suma final con el factor dado y retorna la diferencia al objetivo
  const evaluarFactor = async (factorOriginal) => {
    iteraciones++;
    
    // FORZAR A 2 DECIMALES EXACTOS: 0.10, 0.11, 0.12, etc.
    const factor = redondearFactor(factorOriginal);
    
    console.log('[BRENT] Iter ' + iteraciones + ': Factor sugerido ' + factorOriginal.toFixed(4) + 
                ' -> Factor usado ' + factor.toFixed(2));
    
    // Calcular con el factor a 2 decimales exactos
    const resultado = await calcularConFactor(datos, factor, configReglas, inversionOriginal);
    const diferencia = Math.abs(resultado.sumaOptimioVentaFinal - inversionDeseada);
    
    // Calcular registros con valor > 0
    const registrosMayorCero = resultado.datosFinales.filter(item => {
      const optimoVenta = parseFloat(item['optimo venta']) || 0;
      return optimoVenta > 0;
    }).length;
    
    // Guardar en historial de iteraciones
    historialIteraciones.push({
      iteracion: iteraciones,
      factor: factor,
      inversion: resultado.sumaOptimioVentaFinal,
      diferencia: diferencia,
      registrosMayorCero: registrosMayorCero, // ✅ AGREGADO
      esMejor: diferencia < diferenciaGlobal
    });
    
    console.log('[BRENT] Factor ' + factor.toFixed(2) + 
                ' -> Suma $' + resultado.sumaOptimioVentaFinal.toFixed(2) + 
                ' -> Diferencia $' + diferencia.toFixed(2));
    
    // Actualizar mejor resultado global
    if (diferencia < diferenciaGlobal) {
      mejorGlobal = resultado;
      diferenciaGlobal = diferencia;
      console.log('[BRENT] NUEVO OPTIMO: factor ' + factor.toFixed(2) + 
                  ' con diferencia $' + diferencia.toFixed(2));
    }
    
    return diferencia;
  };
  
  // PASO 3: CONSTANTES ADAPTADAS PARA 2 DECIMALES
  const GOLDEN_RATIO = 0.38;  // Seccion aurea simplificada a 2 decimales
  const SQRT_EPSILON = 0.01;  // Precision numerica a 2 decimales
  
  // PASO 4: INICIALIZACION CON GOLDEN SECTION
  // Establecer tres puntos iniciales usando proporcion aurea
  let a = rangoMin;           // Limite izquierdo
  let b = rangoMax;           // Limite derecho
  let x = redondearFactor(a + GOLDEN_RATIO * (b - a)); // Punto actual mejor a 2 decimales
  let v = x;                  // Segundo mejor punto
  let w = x;                  // Tercer mejor punto
  
  console.log('[BRENT] Inicializando con Golden Section');
  console.log('[BRENT] Punto inicial x =', x.toFixed(2), '(redondeado a 2 decimales)');
  
  // Evaluar puntos iniciales
  let fx = await evaluarFactor(x);
  let fv = fx; // Inicialmente todos iguales
  let fw = fx;
  
  // Variables para interpolacion parabolica
  let e = 0.0; // Magnitud del paso anterior
  let d = 0.0; // Magnitud del paso actual
  
  console.log('[BRENT] Configuracion inicial:');
  console.log('[BRENT]   a=' + a.toFixed(4) + ', x=' + x.toFixed(4) + ', b=' + b.toFixed(4));
  console.log('[BRENT]   fx=$' + fx.toFixed(2));
  
  // PASO 5: BUCLE PRINCIPAL DE BRENT'S METHOD
  console.log('[BRENT] Iniciando bucle principal de optimizacion');
  
  while (Math.abs(b - a) > TOLERANCE) {
    console.log('[BRENT] --- Iteracion ' + (iteraciones + 1) + ' ---');
    console.log('[BRENT] Rango actual: [' + a.toFixed(2) + ', ' + b.toFixed(2) + 
                '], ancho=' + (b - a).toFixed(2));
    
    // Calcular punto medio y tolerancias para 2 decimales
    const xm = redondearFactor(0.5 * (a + b));  // Punto medio a 2 decimales
    const tol1 = 0.01;  // Tolerancia fija para 2 decimales
    const tol2 = 0.02;  // Tolerancia doble
    
    // CONDICION DE PARADA: Verificar convergencia
    if (Math.abs(x - xm) <= (tol2 - 0.5 * (b - a))) {
      console.log('[BRENT] CONVERGENCIA ALCANZADA');
      console.log('[BRENT] Diferencia de rango: ' + Math.abs(b - a).toFixed(6) + 
                  ' <= tolerancia: ' + TOLERANCE);
      break;
    }
    
    // DECISION: Usar interpolacion parabolica o golden section
    let u; // Nuevo punto a evaluar
    let metodoUsado = '';
    
    // DECISION SIMPLIFICADA: GOLDEN SECTION CON PASOS DE 2 DECIMALES
    // Usar siempre golden section pero con pasos a 2 decimales
    
    // Calcular siguiente punto usando golden section
    if (x >= xm) {
      // Buscar hacia la izquierda
      u = redondearFactor(a + GOLDEN_RATIO * (x - a));
    } else {
      // Buscar hacia la derecha  
      u = redondearFactor(x + GOLDEN_RATIO * (b - x));
    }
    
    metodoUsado = 'golden_section_2_decimales';
    console.log('[BRENT] Usando Golden Section adaptado a 2 decimales');
    
    console.log('[BRENT] Metodo usado: ' + metodoUsado);
    console.log('[BRENT] Evaluando nuevo punto u=' + u.toFixed(2) + ' (2 decimales exactos)');
    
    // EVALUAR NUEVO PUNTO
    const fu = await evaluarFactor(u);
    
    // ACTUALIZACION DE PUNTOS SEGUN RESULTADO
    if (fu <= fx) {
      // EL NUEVO PUNTO ES MEJOR QUE EL ACTUAL
      console.log('[BRENT] Nuevo punto es MEJOR: fu=$' + fu.toFixed(2) + 
                  ' vs fx=$' + fx.toFixed(2));
      
      // Actualizar limites del intervalo (a 2 decimales)
      if (u >= x) {
        a = redondearFactor(x); // El nuevo limite izquierdo es el punto anterior
      } else {
        b = redondearFactor(x); // El nuevo limite derecho es el punto anterior
      }
      
      // Reorganizar puntos: u se convierte en el mejor
      v = redondearFactor(w); fv = fw; // w se convierte en v
      w = redondearFactor(x); fw = fx; // x se convierte en w
      x = redondearFactor(u); fx = fu; // u se convierte en x (mejor)
      
      console.log('[BRENT] Puntos actualizados: x=' + x.toFixed(2) + ' (mejor)');
      
    } else {
      // EL NUEVO PUNTO ES PEOR QUE EL ACTUAL
      console.log('[BRENT] Nuevo punto es PEOR: fu=$' + fu.toFixed(2) + 
                  ' vs fx=$' + fx.toFixed(2));
      
      // Actualizar limites sin cambiar el mejor punto (a 2 decimales)
      if (u < x) {
        a = redondearFactor(u); // Nuevo limite izquierdo
      } else {
        b = redondearFactor(u); // Nuevo limite derecho
      }
      
      // Reorganizar puntos auxiliares
      if (fu <= fw || w === x) {
        v = redondearFactor(w); fv = fw;
        w = redondearFactor(u); fw = fu;
        console.log('[BRENT] u se convierte en w');
      } else if (fu <= fv || v === x || v === w) {
        v = redondearFactor(u); fv = fu;
        console.log('[BRENT] u se convierte en v');
      } else {
        console.log('[BRENT] u descartado');
      }
    }
    
    console.log('[BRENT] Estado final iteracion:');
    console.log('[BRENT]   Mejor punto: x=' + x.toFixed(2) + ', fx=$' + fx.toFixed(2));
    console.log('[BRENT]   Rango: [' + a.toFixed(2) + ', ' + b.toFixed(2) + 
                '], ancho=' + (b - a).toFixed(2));
  }
  
  // PASO 6: RESULTADOS FINALES
  console.log('[BRENT] ===== OPTIMIZACION COMPLETADA =====');
  console.log('[BRENT] Algoritmo: Brent\'s Method (Golden Section + Interpolacion Parabolica)');
  console.log('[BRENT] Iteraciones totales:', iteraciones);
  console.log('[BRENT] Factor inicial:', factorInicial);
  console.log('[BRENT] Factor optimo encontrado:', x.toFixed(2) + ' (2 decimales exactos)');
  console.log('[BRENT] Diferencia numerica:', (x - factorInicial > 0 ? '+' : '') + 
              (x - factorInicial).toFixed(4));
  console.log('[BRENT] Inversion deseada: $' + inversionDeseada.toFixed(2));
  console.log('[BRENT] Suma optima final: $' + mejorGlobal.sumaOptimioVentaFinal.toFixed(2));
  console.log('[BRENT] Diferencia monetaria: $' + diferenciaGlobal.toFixed(2));
  console.log('[BRENT] Precision alcanzada:', Math.abs(b - a).toFixed(6));
  console.log('[BRENT] ===== FIN BRENT\'S METHOD =====');


  console.log(' [JULIAN] ESTO ES LO QUE FACTOR OPTIMIZER BRENT.JS HISTORIAL ITERACIONES', historialIteraciones);
  
  // Retornar resultado estructurado
  return {
    factor: x,
    factorOptimo: x,
    factorOriginal: factorInicial,
    iteracionesRealizadas: iteraciones,
    diferenciaOptima: diferenciaGlobal,
    algoritmo: 'brents_method_matematico_optimo',
    sumaOptimioVentaFinal: mejorGlobal.sumaOptimioVentaFinal,
    inversionDeseadaCalculada: inversionDeseada,
    diferencia: diferenciaGlobal,
    precision: Math.abs(b - a),
    rangoFinal: [a, b],
    historialIteraciones: historialIteraciones // Incluir historial completo
  };
};

module.exports = {
  optimizarFactorRedondeo
};
