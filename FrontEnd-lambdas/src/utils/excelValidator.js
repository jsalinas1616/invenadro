import * as XLSX from 'xlsx';
import { REQUIRED_COLUMNS } from '../constants/config';

/**
 * Valida las columnas requeridas en un archivo Excel
 * @param {File} archivo - Archivo Excel a validar
 * @returns {Promise<Object>} Resultado de la validación
 */
export const validarColumnasExcel = async (archivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON para obtener headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0] || [];
        
        console.log('Headers encontrados:', headers);
        
        // Validar columnas de precio
        const tienePrecio = headers.some(header => {
          const headerLower = header.toLowerCase().replace(/\s+/g, '');
          return headerLower.includes('preciofarmacia') || 
                 headerLower.includes('precio');
        });
        
        // Validar columnas de inversión
        const tieneInversion = headers.some(header => {
          const headerLower = header.toLowerCase().replace(/\s+/g, '');
          return headerLower.includes('inversion') || 
                 headerLower.includes('inv');
        });
        
        if (!tienePrecio) {
          resolve({
            esValido: false,
            error: 'PRECIO_FALTANTE',
            mensaje: 'El archivo debe tener una columna de precio (Ej: "Precio Farmacia", "Precio", etc.)',
            headersEncontrados: headers
          });
          return;
        }
        
        if (!tieneInversion) {
          resolve({
            esValido: false,
            error: 'INVERSION_FALTANTE', 
            mensaje: 'El archivo debe tener una columna de inversión (Ej: "Inversión", "Inv", etc.)',
            headersEncontrados: headers
          });
          return;
        }
        
        // Validar columnas obligatorias
        const columnasFaltantes = [];
        
        for (const columnaRequerida of REQUIRED_COLUMNS) {
          const encontrada = columnaRequerida.variantes.some(variante => 
            headers.some(header => header === variante)
          );
          
          if (!encontrada) {
            columnasFaltantes.push(columnaRequerida.nombre);
          }
        }
        
        const esValido = columnasFaltantes.length === 0;
        
        resolve({
          esValido,
          columnasFaltantes,
          headersEncontrados: headers,
          tienePrecio,
          tieneInversion,
          totalColumnas: headers.length,
          totalRegistros: jsonData.length - 1 // -1 para excluir header
        });
        
      } catch (error) {
        console.error('Error validando archivo Excel:', error);
        reject(new Error(`Error leyendo archivo Excel: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };
    
    reader.readAsBinaryString(archivo);
  });
};

/**
 * Detecta si un archivo Excel tiene múltiples clientes
 * @param {File} archivo - Archivo Excel a analizar
 * @returns {Promise<Object>} Información sobre los clientes detectados
 */
export const detectarClientes = async (archivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          resolve({
            clientesDetectados: [],
            totalClientes: 0,
            esMultiCliente: false
          });
          return;
        }
        
        // Buscar columna de cliente
        const primeraFila = jsonData[0];
        const posiblesColumnasCliente = ['Cliente', 'CLIENTE', 'cliente', 'Client', 'CLIENT'];
        let columnaCliente = null;
        
        for (const col of posiblesColumnasCliente) {
          if (primeraFila.hasOwnProperty(col)) {
            columnaCliente = col;
            break;
          }
        }
        
        if (!columnaCliente) {
          resolve({
            clientesDetectados: [],
            totalClientes: 0,
            esMultiCliente: false,
            error: 'No se encontró columna de Cliente'
          });
          return;
        }
        
        // Contar clientes únicos
        const clientesUnicos = new Set();
        jsonData.forEach(fila => {
          const cliente = fila[columnaCliente];
          if (cliente && cliente.toString().trim() !== '') {
            clientesUnicos.add(cliente.toString().trim());
          }
        });
        
        const clientesArray = Array.from(clientesUnicos);
        
        resolve({
          clientesDetectados: clientesArray,
          totalClientes: clientesArray.length,
          esMultiCliente: clientesArray.length > 1,
          columnaCliente
        });
        
      } catch (error) {
        console.error('Error detectando clientes:', error);
        reject(new Error(`Error analizando clientes: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };
    
    reader.readAsBinaryString(archivo);
  });
};
