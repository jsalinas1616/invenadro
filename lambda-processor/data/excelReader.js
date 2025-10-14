const XLSX = require('xlsx');
const path = require('path');

/**
 * LEER DATOS DE EXCEL
 * 
 * Lee y procesa archivos Excel, convirtiendo las hojas a formato JSON.
 * 
 * @param {Buffer|string} input - Archivo Excel como buffer o ruta
 * @param {Object} configReglas - Configuración para filtros (opcional)
 * @returns {Array} Datos procesados del Excel
 */
const leerDatosExcel = async (input, configReglas = null) => {
  console.log(`[entrada.xlsx] ${new Date().toISOString()} - Iniciando lectura de Excel...`);
  
  try {
    let workbook;
    let rutaArchivo = '';
    
    // Determinar si es buffer o ruta
    const esBuffer = Buffer.isBuffer(input);
    console.log(`[EXCEL] Tipo de input: ${typeof input}, es buffer: ${esBuffer}`);
    
    if (esBuffer) {
      workbook = XLSX.read(input, { type: 'buffer' });
    } else {
      rutaArchivo = input;
      console.log(`[EXCEL] Leyendo archivo desde ruta: ${rutaArchivo}`);
      workbook = XLSX.readFile(rutaArchivo);
    }
    
    // Obtener nombres de hojas
    const hojas = workbook.SheetNames;
    console.log(`[EXCEL] Workbook leído. Hojas disponibles: ${hojas.join(', ')}`);
    
    // Usar la primera hoja por defecto
    const nombreHoja = hojas[0];
    console.log(`[EXCEL] ${new Date().toISOString()} - Convirtiendo hoja "${nombreHoja}" a JSON...`);
    
    // Monitorear memoria antes de la conversión
    const memoriaAntes = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[EXCEL] Memoria antes de sheet_to_json: ${Math.round(memoriaAntes)} MB`);
    
    // Convertir hoja a JSON
    const tiempoInicio = Date.now();
    const datosRaw = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja], { 
      header: 1,
      defval: '',
      blankrows: false
    });
    const tiempoConversion = Date.now() - tiempoInicio;
    
    const memoriaDespues = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[EXCEL] ${new Date().toISOString()} - Conversión completada en ${tiempoConversion}ms. Filas raw: ${datosRaw.length}`);
    console.log(`[EXCEL] Memoria después de sheet_to_json: ${Math.round(memoriaDespues)} MB`);
    
    // Procesar datos
    console.log(`[EXCEL] ${new Date().toISOString()} - Procesando ${datosRaw.length - 1} filas de datos...`);
    const tiempoProcesamiento = Date.now();
    
    // Obtener headers de la primera fila
    const headers = datosRaw[0];
    console.log(`[EXCEL HEADERS] Headers detectados:`, headers);
    console.log(`[EXCEL HEADERS] Total headers: ${headers.length}`);
    const filasDatos = datosRaw.slice(1);
    
    // Convertir a objetos con headers como claves
    let datosProcesados = filasDatos
      .filter(fila => fila.some(celda => celda !== '')) // Filtrar filas vacías
      .map(fila => {
        const objeto = {};
        headers.forEach((header, index) => {
          if (header) {
            objeto[header] = fila[index] || '';
          }
        });
        
        // 🔄 TRUCO: FORZAR uso de Material como EAN/UPC para Databricks
        // SIEMPRE usar Material (1, 2, 3... o 40513, 15232... todos son válidos)
        // El formateo a 18 dígitos se hace en databricksService.js
        if (objeto['Material']) {
          const originalEAN = objeto['EAN/UPC'];
          objeto['EAN/UPC'] = objeto['Material'];  // SIEMPRE reemplazar
          console.log(`[EXCEL MAPPING] ✅ Material ${objeto['Material']} → EAN/UPC (era "${originalEAN}")`);
        } else {
          console.log(`[EXCEL MAPPING] ⚠️ No hay Material, usando EAN/UPC original`);
        }
        
        return objeto;
      });
    
    // 🚀 FILTRO DE PRECIO MÁXIMO - ELIMINAR PRODUCTOS CAROS DESDE EL INICIO
    if (configReglas && typeof configReglas.precioMaximo === 'number') {
      const totalAntesFiltro = datosProcesados.length;
      
      datosProcesados = datosProcesados.filter(item => {
        // Buscar columna de precio con flexibilidad
        const precioFarmaciaKey = Object.keys(item).find(key => {
          const keyLower = key.toLowerCase().replace(/\s+/g, '');
          return keyLower.includes('preciofarmacia') ||
                 keyLower.includes('precio') && keyLower.includes('farmacia') ||
                 keyLower.includes('preciocompra') ||
                 keyLower.includes('precio');
        });
        
        if (!precioFarmaciaKey) return true; // Si no hay precio, incluir
        
        const precio = parseFloat(item[precioFarmaciaKey]) || 0;
        const cumpleFiltro = precio > 0 && precio <= configReglas.precioMaximo;
        
        if (!cumpleFiltro && precio > configReglas.precioMaximo) {
          // Log opcional para productos excluidos
          // console.log(`[FILTRO] Excluido por precio alto: ${item[precioFarmaciaKey]} > ${configReglas.precioMaximo}`);
        }
        
        return cumpleFiltro;
      });
      
      const productosExcluidos = totalAntesFiltro - datosProcesados.length;
      console.log(`[FILTRO] 💰 Precio máximo: $${configReglas.precioMaximo}`);
      console.log(`[FILTRO] ✅ Productos incluidos: ${datosProcesados.length}`);
      console.log(`[FILTRO] ❌ Productos excluidos: ${productosExcluidos} (precio > $${configReglas.precioMaximo})`);
    }
    
    const tiempoProcesamientoTotal = Date.now() - tiempoProcesamiento;
    console.log(`[EXCEL] ${new Date().toISOString()} - Procesamiento completado en ${tiempoProcesamientoTotal}ms. Filas válidas: ${datosProcesados.length} de ${filasDatos.length} originales`);
    
    // Limpiar memoria
    const memoriaAntesCleanup = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[EXCEL] Memoria antes de cleanup: ${Math.round(memoriaAntesCleanup)} MB`);
    
    // Liberar referencias grandes
    workbook = null;
    
    console.log(`[entrada.xlsx] ${new Date().toISOString()} - Excel leído correctamente en ${Date.now() - tiempoInicio}ms. Filas: ${datosProcesados.length}`);
    
    return datosProcesados;
    
  } catch (error) {
    console.error(`[EXCEL] Error leyendo Excel:`, error);
    throw error;
  }
};

module.exports = {
  leerDatosExcel
}; 