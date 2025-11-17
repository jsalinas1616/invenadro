// Importar Amplify para obtener el token JWT
import { fetchAuthSession } from 'aws-amplify/auth';
// Importar configuración por ambiente
import { getConfig } from '../config/environments';

// Obtener configuración del ambiente actual
const env = getConfig();

// Configuración para AWS Lambda - Multi-ambiente
const config = {
  lambdaInitiatorUrl: `${env.apiGateway.url}/calcular-redondeo`,
  apiGatewayBaseUrl: env.apiGateway.url,
  awsRegion: env.region,
  s3ResultsBucket: env.s3.resultsBucket,
  dynamoDBTable: env.dynamodb.jobsTable,
  s3UploadsBucket: env.s3.uploadsBucket,
  stepFunctionArn: env.stepFunction.arn,
  statusPollingInterval: 5000,
  maxRetries: 3,
  retryDelay: 2000
};

// Log del ambiente actual (útil para debugging)
console.log(`🌍 Lambda Service configurado para ambiente: ${env.name} (${env.displayName})`);
console.log(`📡 API Gateway: ${config.apiGatewayBaseUrl}`);

class LambdaService {
  /**
   * 🔐 Obtener headers con autenticación JWT
   * Esta función obtiene el token de Cognito y lo agrega a los headers
   */
  async getAuthHeaders(additionalHeaders = {}) {
    try {
      // Obtener la sesión actual del usuario autenticado
      const session = await fetchAuthSession();
      
      // Extraer el token ID (JWT) de la sesión
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación. Por favor inicia sesión nuevamente.');
      }
      
      // Retornar headers con el token en formato Bearer
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // 🔑 Token JWT aquí
        ...additionalHeaders
      };
    } catch (error) {
      console.error('Error obteniendo token de autenticación:', error);
      throw new Error('Error de autenticación. Por favor inicia sesión nuevamente.');
    }
  }
  // Iniciar procesamiento de archivo
  async initiateProcessing(file, customConfig) {
    try {
      console.log('Iniciando procesamiento...');
      console.log(`📦 Archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // SIEMPRE usar presigned URL para subir a S3 (más simple y consistente)
      
      // 1. Obtener presigned URL
      const presignedResponse = await fetch(`${config.apiGatewayBaseUrl}/get-presigned-url`, {
        method: 'POST',
        headers: await this.getAuthHeaders(), // 🔐 Headers con JWT
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
      });
      
      if (!presignedResponse.ok) {
        throw new Error('Error obteniendo presigned URL');
      }
      
      const { presignedUrl, bucket, key } = await presignedResponse.json();
      console.log('✅ Presigned URL obtenida');
      
      // 2. Subir archivo directo a S3
      console.log('📤 Subiendo archivo a S3...');
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        body: file
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error subiendo archivo a S3');
      }
      
      console.log('✅ Archivo subido a S3');
      
      // 3. Iniciar procesamiento con referencia a S3
      const payload = {
        s3Bucket: bucket,
        s3Key: key,
        customConfig: customConfig,
        originalname: file.name
      };
      
      return await this.callLambdaViaAPI(payload);
      
    } catch (error) {
      console.error('Error iniciando procesamiento:', error);
      throw new Error(`Error iniciando procesamiento: ${error.message}`);
    }
  }
  
  // Llamar Lambda a través de API Gateway
  async callLambdaViaAPI(payload) {
    const response = await fetch(config.lambdaInitiatorUrl, {
      method: 'POST',
      headers: await this.getAuthHeaders(), // 🔐 Headers con JWT
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en la API');
    }
    
    return await response.json();
  }
  
  // Llamar Lambda directamente (para desarrollo)
  async callLambdaDirectly(payload) {
    // Nota: Esto requiere permisos especiales en AWS
    // Para desarrollo, es mejor usar API Gateway
    throw new Error('Llamada directa a Lambda no implementada. Configura API Gateway.');
  }
  
  // Consultar estado del proceso
  async checkProcessStatus(processId) {
    try {
      console.log(`Consultando estado para processId: ${processId}`);
      
      // Llamar al endpoint de status
      const response = await fetch(`${config.lambdaInitiatorUrl}/status/${processId}`, {
        method: 'GET',
        headers: await this.getAuthHeaders() // 🔐 Headers con JWT
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Error consultando estado:', error);
      throw new Error(`Error consultando estado: ${error.message}`);
    }
  }
  
  // Descargar resultado del proceso
  async downloadResult(processId) {
    try {
      console.log(`Descargando resultado para processId: ${processId}`);
      
      // Llamar a un endpoint específico para descargar resultado
      const response = await fetch(`${config.lambdaInitiatorUrl}/download/${processId}`, {
        method: 'GET',
        headers: await this.getAuthHeaders() // 🔐 Headers con JWT
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error descargando resultado');
      }
      
      const resultData = await response.json();
      return resultData;
      
    } catch (error) {
      console.error('Error descargando resultado:', error);
      throw new Error(`Error descargando resultado: ${error.message}`);
    }
  }
  
  // Función de utilidad para formatear timestamps
  formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return timestamp;
    }
  }
  
  // Función de utilidad para obtener el estado legible
  getReadableStatus(status) {
    const statusMap = {
      'RUNNING': '🔄 Iniciando',
      'PROCESSING': '⚙️ Procesando Excel',
      'PROCESSED': '✅ Excel Procesado',
      'CHECKING': '🔍 Verificando Estado',
      'CHECKED': '✅ Estado Verificado',
      'DOWNLOADING': '📥 Generando Resultado',
      'COMPLETED': 'Completado',
      'FAILED': '❌ Falló'
    };
    
    return statusMap[status] || status;
  }

  // Descargar Excel específico por cliente
  async downloadClientExcel(processId, clienteId) {
    try {
      console.log(`Descargando Excel para cliente ${clienteId} del proceso ${processId}`);
      
      // Construir la URL del endpoint lambda-excel-generator usando la URL base dinámica
      const downloadUrl = `${this.baseURL}/excel/${processId}/${clienteId}`;
      
      console.log(`Llamando a endpoint: ${downloadUrl}`);
      
      // Descargar el archivo del endpoint
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: await this.getAuthHeaders({
          'Accept': 'text/plain'
        })
      });
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          console.error('ERROR: Error response body:', errorText);
        } catch (e) {
          errorText = 'No se pudo leer el mensaje de error';
        }
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      // Verificar Content-Type
      const contentType = response.headers.get('content-type');
      console.log(`Content-Type recibido: ${contentType}`);
      
      // Obtener el contenido (puede ser JSON o texto)
      const responseText = await response.text();
      
      console.log('Response recibido, primeros 200 chars:', responseText.substring(0, 200));
      
      // DETECTAR si es JSON o Base64 directo
      let base64Text;
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('Response es JSON, keys:', Object.keys(jsonResponse));
        base64Text = jsonResponse.body || jsonResponse.excel || jsonResponse.data || responseText;
      } catch (e) {
        console.log('Response NO es JSON, es texto directo');
        base64Text = responseText;
      }
      
      // VALIDAR que recibimos algo
      if (!base64Text || base64Text.trim().length === 0) {
        throw new Error('El servidor devolvió una respuesta vacía');
      }
      
      console.log(`Excel Base64 final, tamaño: ${base64Text.length} chars`);
      console.log('Primeros 50 caracteres:', base64Text.substring(0, 50));
      
      // VALIDAR primeros caracteres (Excel siempre empieza con "PK" en Base64 = "UEs")
      if (!base64Text.startsWith('UEs')) {
        console.warn('WARNING: El archivo NO parece ser un Excel válido (no empieza con "UEs")');
        console.warn('Contenido completo (primeros 500):', base64Text.substring(0, 500));
        throw new Error('El servidor no devolvió un archivo Excel válido');
      }
      
      return base64Text;
    } catch (error) {
      console.error('ERROR: Error descargando Excel del cliente:', error);
      throw error;
    }
  }

  // Obtener detalles específicos de un cliente
  async getClientDetails(processId, clienteId) {
    try {
      console.log(`Obteniendo detalles del cliente ${clienteId} del proceso ${processId}`);
      
      // Obtener el resultado completo del proceso
      const fullResult = await this.downloadResult(processId);
      
      if (!fullResult || !fullResult.datos) {
        throw new Error('No se encontraron datos del proceso');
      }
      
      // Filtrar datos específicos del cliente
      const clientData = fullResult.datos.filter(item => 
        (item.Cliente || item.cliente) === clienteId
      );
      
      if (clientData.length === 0) {
        throw new Error(`No se encontraron datos para el cliente ${clienteId}`);
      }
      
      // Calcular métricas específicas del cliente
      const totalRegistros = clientData.length;
      const totalInversion = clientData.reduce((sum, item) => sum + (item.Importe || 0), 0);
      const materialesUnicos = new Set(clientData.map(item => item.Material)).size;
      
      return {
        clienteId,
        totalRegistros,
        totalInversion,
        materialesUnicos,
        datos: clientData,
        resumen: {
          productos: materialesUnicos,
          categorias: new Set(clientData.map(item => item['Categoría de Material'])).size
        }
      };
    } catch (error) {
      console.error('Error obteniendo detalles del cliente:', error);
      throw error;
    }
  }
}

const lambdaService = new LambdaService();
export default lambdaService;
