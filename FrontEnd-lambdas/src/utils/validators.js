/**
 * Data validation utilities - Enterprise grade
 * @module utils/validators
 */

import * as XLSX from 'xlsx';
import { REQUIRED_EXCEL_COLUMNS, FILE_SIZE_LIMITS, SUPPORTED_FILE_TYPES } from '../constants/config';

/**
 * Validation result interface
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string} error - Error message if validation failed
 * @property {Array} data - Parsed data if available
 */

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @returns {ValidationResult} Validation result
 */
export const validateFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No se ha seleccionado ningún archivo' };
  }

  // Check file size
  if (file.size > FILE_SIZE_LIMITS.MAX_SIZE_BYTES) {
    return { 
      isValid: false, 
      error: `El archivo es demasiado grande. Máximo ${FILE_SIZE_LIMITS.MAX_SIZE_MB}MB` 
    };
  }

  // Check file extension
  const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  const supportedTypes = Object.values(SUPPORTED_FILE_TYPES);
  
  if (!supportedTypes.includes(fileExtension)) {
    return { 
      isValid: false, 
      error: `Formato de archivo no soportado. Use: ${supportedTypes.join(', ')}` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate Excel file columns
 * @param {File} file - Excel file to validate
 * @returns {Promise<ValidationResult>} Validation result with headers
 */
export const validateExcelColumns = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON to get headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0] || [];
        
        console.log('📊 Headers encontrados:', headers);
        
        // Check required columns
        const missingColumns = REQUIRED_EXCEL_COLUMNS.filter(
          required => !headers.some(header => 
            header && header.toString().toLowerCase().includes(required.toLowerCase())
          )
        );
        
        if (missingColumns.length > 0) {
          resolve({
            isValid: false,
            error: `Columnas faltantes: ${missingColumns.join(', ')}`,
            data: { headers, missingColumns }
          });
          return;
        }
        
        // Count total rows (excluding header)
        const totalRows = jsonData.length - 1;
        
        resolve({
          isValid: true,
          error: null,
          data: { 
            headers, 
            totalRows, 
            sheetName,
            preview: jsonData.slice(0, 5) // First 5 rows for preview
          }
        });
        
      } catch (error) {
        console.error('❌ Error validando Excel:', error);
        resolve({
          isValid: false,
          error: 'Error al leer el archivo Excel. Verifique que no esté corrupto.',
          data: null
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        isValid: false,
        error: 'Error al leer el archivo',
        data: null
      });
    };
    
    reader.readAsBinaryString(file);
  });
};

/**
 * Validate configuration object
 * @param {Object} config - Configuration to validate
 * @returns {ValidationResult} Validation result
 */
export const validateConfig = (config) => {
  const errors = [];
  
  if (config.joroba < 0 || config.joroba > 100) {
    errors.push('Joroba debe estar entre 0 y 100%');
  }
  
  if (config.diasInversionDeseados <= 0) {
    errors.push('Días de inversión debe ser mayor a 0');
  }
  
  if (config.precioMaximo < 0) {
    errors.push('Precio máximo debe ser mayor o igual a 0');
  }
  
  return {
    isValid: errors.length === 0,
    error: errors.join(', '),
    data: config
  };
};

/**
 * Validate process ID format
 * @param {string} processId - Process ID to validate
 * @returns {boolean} Whether process ID is valid
 */
export const validateProcessId = (processId) => {
  if (!processId || typeof processId !== 'string') return false;
  
  // UUID format validation (basic)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(processId);
};
