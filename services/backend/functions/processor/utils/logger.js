const fs = require('fs');
const path = require('path');

// Ruta del archivo de logs
const logFilePath = path.join(__dirname, '../../logs.txt');

// Función para limpiar el archivo de logs al inicio de cada ejecución
const clearLogs = () => {
  // NO hacer nada en AWS Lambda (sistema read-only)
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log('AWS Lambda detectado - limpieza de logs omitida');
    return;
  }
  
  try {
    // Crear el directorio si no existe
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Borrar el archivo si existe y crear uno nuevo
    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
      console.log('Archivo de logs anterior eliminado');
    }
    
    // Crear archivo nuevo con timestamp de inicio
    const timestamp = new Date().toISOString();
    const header = `=== NUEVA EJECUCIÓN INICIADA: ${timestamp} ===\n`;
    fs.writeFileSync(logFilePath, header, 'utf8');
    console.log('Nuevo archivo de logs creado');
    
  } catch (error) {
    console.error('Error limpiando archivo de logs:', error.message);
  }
};

// Función para escribir logs tanto en consola como en archivo
const logToFile = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage); // Solo imprimir en consola en AWS Lambda
  
  // NO escribir archivos en AWS Lambda (sistema read-only)
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      fs.appendFileSync(logFilePath, logMessage + '\n', 'utf8');
    } catch (error) {
      console.error('Error escribiendo en archivo de logs:', error.message);
    }
  }
};

// Función para obtener la ruta del archivo de logs
const getLogFilePath = () => {
  return logFilePath;
};

// Override global de console.log, console.error, console.warn
const setupGlobalLogging = () => {
  // EN AWS LAMBDA: NO hacer override de console para evitar loops infinitos
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log('AWS Lambda detectado - logging global deshabilitado para evitar errores EROFS');
    return;
  }
  
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.log = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Escribir en archivo (solo en desarrollo local)
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [INFO] ${message}`;
      fs.appendFileSync(logFilePath, logMessage + '\n', 'utf8');
    } catch (error) {
      // Si falla, usar console original para no perder el mensaje
      originalConsoleError('Error escribiendo en archivo de logs:', error.message);
    }
    
    // Llamar al console.log original
    originalConsoleLog(...args);
  };
  
  console.error = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Escribir en archivo (solo en desarrollo local)
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [ERROR] ${message}`;
      fs.appendFileSync(logFilePath, logMessage + '\n', 'utf8');
    } catch (error) {
      originalConsoleError('Error escribiendo en archivo de logs:', error.message);
    }
    
    // Llamar al console.error original
    originalConsoleError(...args);
  };
  
  console.warn = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Escribir en archivo (solo en desarrollo local)
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [WARN] ${message}`;
      fs.appendFileSync(logFilePath, logMessage + '\n', 'utf8');
    } catch (error) {
      originalConsoleError('Error escribiendo en archivo de logs:', error.message);
    }
    
    // Llamar al console.warn original
    originalConsoleWarn(...args);
  };
  
  console.log('Sistema de logging global configurado - todos los console.log se guardarán automáticamente');
};

module.exports = {
  logToFile,
  clearLogs,
  getLogFilePath,
  setupGlobalLogging
}; 