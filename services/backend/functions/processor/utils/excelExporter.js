const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Función helper para definir columnas calculadas
const getColumnasCalculadas = () => [
  'valor optimo redondeado',
  'valor optimo rescate aplicado', 
  'valor optimo rescate',
  'joroba aplicada',
  'joroba',
  'sub empaque aplicado',
  'sub empaque',
  'optimo venta',
  'suma optimo venta',
  'Regla OptimoP aplicada',
  'valor ReglaOptimoP',
  'Regla OptimoQ aplicada',
  'valor ReglaOptimoQ',
  'VtasTrimDataBrick',
  'VtasAnualDataBrick'
];

// Configuración de S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

// ✅ Variable de entorno para S3 (si se necesita)
// Nota: Esta utilidad no se usa actualmente en el flujo principal
const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.RESULTS_BUCKET || 'invenadro-backend-exports';

// Función auxiliar para determinar el directorio de export según el entorno
const determinarDirectorioExport = () => {
  // Múltiples formas de detectar AWS Lambda
  const esAWSLambda = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined || 
                     process.env.LAMBDA_TASK_ROOT !== undefined ||
                     process.env.AWS_EXECUTION_ENV !== undefined;
  const esAppRunner = process.env.NODE_ENV === 'production' && !esAWSLambda;
  
  console.log('Detección de entorno:', {
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
    LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT,
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV,
    esAWSLambda
  });
  
  if (esAWSLambda) {
    console.log('Entorno detectado: AWS Lambda - usando /tmp');
    return '/tmp';
  } else if (esAppRunner) {
    console.log('Entorno detectado: App Runner - usando /app/export');
    return '/app/export';  // App Runner usa /app como workdir
  } else {
    console.log('Entorno detectado: Local development - usando ./export');
    return './export';     // Local development
  }
};

// Función para subir archivo a S3
const subirAchivoAS3 = async (rutaArchivo, nombreArchivo) => {
  try {
    const fileContent = fs.readFileSync(rutaArchivo);
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `exports/${nombreArchivo}`,
      Body: fileContent,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    await s3Client.send(command);
    
    // Retornar la URL de S3
    const s3Url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/exports/${nombreArchivo}`;
    console.log('Archivo subido a S3:', s3Url);
    
    return s3Url;
  } catch (error) {
    console.error('Error subiendo a S3:', error);
    throw error;
  }
};

const exportarAExcel = async (datos, nombreArchivo = 'datos_export.xlsx') => {
  try {
    console.log('exportarAExcel iniciado con:', {
      datosLength: datos?.length,
      nombreArchivo,
      datosType: typeof datos,
      esArray: Array.isArray(datos)
    });
    
    // Validar que tengamos datos
    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Crear un nuevo workbook con ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');
    
    // Usar función helper para columnas calculadas
    const columnasCalculadas = getColumnasCalculadas();
    
    // Obtener headers
    const headers = Object.keys(datos[0]);
    
    // Configurar columnas y headers
    worksheet.columns = headers.map(header => ({
      header: header,
      key: header,
      width: 15
    }));
    
    // Aplicar estilos a los headers
    headers.forEach((header, colIndex) => {
      const cell = worksheet.getCell(1, colIndex + 1);
      
      // Determinar si es columna calculada o original
      const esCalculada = columnasCalculadas.some(col => 
        header.toLowerCase().trim() === col.toLowerCase().trim()
      );
      
      if (esCalculada) {
        // Headers calculados: fondo amarillo + texto negro
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Amarillo
        };
        cell.font = {
          color: { argb: 'FF000000' }, // Negro
          bold: true
        };
      } else {
        // Headers originales: fondo azul oscuro + texto blanco
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E79' } // Azul oscuro
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' }, // Blanco
          bold: true
        };
      }
      
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    });
    
    // Agregar los datos con formato especial para EANs
    datos.forEach((dato, rowIndex) => {
      const row = worksheet.addRow(dato);
      
      // Buscar columna EAN/UPC y formatear como texto
      headers.forEach((header, colIndex) => {
        if (header === 'EAN/UPC') {
          const cell = row.getCell(colIndex + 1);
          // Forzar como texto para evitar notación científica
          cell.value = { richText: [{ text: String(dato[header]) }] };
          cell.numFmt = '@'; // Formato de texto
        }
      });
    });
    
    // Determinar directorio según entorno
    const carpetaExport = determinarDirectorioExport();
    
    // Crear la carpeta export si no existe
    if (!fs.existsSync(carpetaExport)) {
      fs.mkdirSync(carpetaExport, { recursive: true });
      console.log(`Directorio creado: ${carpetaExport}`);
    }
    
    // Crear la ruta completa del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreConTimestamp = nombreArchivo.replace('.xlsx', `_${timestamp}.xlsx`);
    const rutaCompleta = path.join(carpetaExport, nombreConTimestamp);
    
    console.log(`Guardando Excel en: ${rutaCompleta}`);
    
    // Escribir el archivo
    console.log('Intentando escribir archivo en:', rutaCompleta);
    await workbook.xlsx.writeFile(rutaCompleta);
    console.log('Archivo escrito exitosamente');
    
    // Determinar si estamos en producción (AppRunner o Lambda)
    const esProduccion = process.env.NODE_ENV === 'production' || process.env.LAMBDA_FUNCTION_NAME;
    
    if (esProduccion) {
      // En producción, subir a S3
      console.log('Modo producción: subiendo archivo a S3...');
      const s3Url = await subirAchivoAS3(rutaCompleta, nombreConTimestamp);
      
      // Limpiar archivo local después de subir a S3
      try {
        fs.unlinkSync(rutaCompleta);
        console.log('🗑️ Archivo local eliminado después de subir a S3');
      } catch (cleanupError) {
        console.warn('⚠️ No se pudo eliminar archivo local:', cleanupError.message);
      }
      
      return s3Url;
    } else {
      // En desarrollo, retornar ruta local
      console.log('Modo desarrollo: archivo guardado localmente');
      return rutaCompleta;
    }
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    throw error;
  }
};

const exportarACSV = (datos, nombreArchivo = 'datos_export.csv') => {
  try {
    // Validar que tengamos datos
    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Determinar directorio según entorno
    const carpetaExport = determinarDirectorioExport();
    
    // Crear la carpeta export si no existe
    if (!fs.existsSync(carpetaExport)) {
      fs.mkdirSync(carpetaExport, { recursive: true });
      console.log(`Directorio creado: ${carpetaExport}`);
    }
    
    // Obtener headers del primer objeto
    const headers = Object.keys(datos[0]);
    
    // Crear el contenido CSV
    let csvContent = headers.join(',') + '\n';
    
    // Agregar cada fila de datos
    datos.forEach(dato => {
      const fila = headers.map(header => {
        let valor = dato[header];
        
        // Manejar valores null/undefined
        if (valor === null || valor === undefined) {
          valor = '';
        }
        
        // Forzar EANs como texto para evitar notación científica
        if (header === 'EAN/UPC' && typeof valor === 'number') {
          valor = `"${valor}"`;
          return valor;
        }
        
        // Si el valor contiene comas, comillas o saltos de línea, envolverlo en comillas
        if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"') || valor.includes('\n'))) {
          valor = '"' + valor.replace(/"/g, '""') + '"';
        }
        
        return valor;
      });
      
      csvContent += fila.join(',') + '\n';
    });
    
    // Crear la ruta completa del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreConTimestamp = nombreArchivo.replace('.csv', `_${timestamp}.csv`);
    const rutaCompleta = path.join(carpetaExport, nombreConTimestamp);
    
    console.log(`Guardando CSV en: ${rutaCompleta}`);
    
    // Escribir el archivo
    fs.writeFileSync(rutaCompleta, csvContent, 'utf8');
    
    return rutaCompleta;
  } catch (error) {
    console.error('Error exportando a CSV:', error);
    throw error;
  }
};

/**
 * Crear archivo Excel en memoria (para SQS Worker)
 * 
 * Esta función crea un archivo Excel en memoria y retorna el buffer,
 * sin guardarlo en disco. Útil para subir directamente a S3.
 * 
 * @param {Array} datos - Array de objetos con los datos a exportar
 * @returns {Buffer} Buffer del archivo Excel
 */
const createExcelFile = async (datos) => {
  try {
    // Validar que tengamos datos
    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Crear un nuevo workbook con ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos Optimizados');
    
    // Usar función helper para columnas calculadas
    const columnasCalculadas = getColumnasCalculadas();
    
    // Obtener headers
    const headers = Object.keys(datos[0]);
    
    // Configurar columnas y headers
    worksheet.columns = headers.map(header => ({
      header: header,
      key: header,
      width: 15
    }));
    
    // Aplicar estilos a los headers
    headers.forEach((header, colIndex) => {
      const cell = worksheet.getCell(1, colIndex + 1);
      
      // Determinar si es columna calculada o original
      const esCalculada = columnasCalculadas.some(col => 
        header.toLowerCase().trim() === col.toLowerCase().trim()
      );
      
      if (esCalculada) {
        // Headers calculados: fondo amarillo + texto negro
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Amarillo
        };
        cell.font = {
          color: { argb: 'FF000000' }, // Negro
          bold: true
        };
      } else {
        // Headers originales: fondo azul oscuro + texto blanco
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E79' } // Azul oscuro
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' }, // Blanco
          bold: true
        };
      }
      
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    });
    
    // Agregar los datos
    datos.forEach(dato => {
      worksheet.addRow(dato);
    });
    
    // Crear buffer en memoria
    const buffer = await workbook.xlsx.writeBuffer();
    
    console.log(`Excel buffer creado: ${buffer.length} bytes`);
    
    return buffer;
    
  } catch (error) {
    console.error('Error creando Excel buffer:', error);
    throw error;
  }
};

module.exports = { exportarAExcel, exportarACSV, createExcelFile }; 