import { fetchAuthSession } from 'aws-amplify/auth';
import { getConfig } from '../config/environments';

const config = getConfig();

/**
 * IPPService - Servicio para comunicación con Lambdas del módulo IPP
 * 
 * Endpoints:
 * - POST /ipp/validate-clients - Validar clientes contra configuración Databricks
 * - POST /ipp/start - Iniciar proceso IPP (trigger Job 1)
 * - GET /ipp/status/{job_id} - Consultar estado del proceso
 * - GET /ipp/results/{job_id} - Obtener resultados finales
 */
class IPPService {
  constructor() {
    this.baseURL = config.apiGateway.url;
  }

  /**
   * Obtener headers con autenticación JWT
   */
  async getAuthHeaders(additionalHeaders = {}) {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación. Por favor inicia sesión nuevamente.');
      }
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...additionalHeaders
      };
    } catch (error) {
      console.error('Error obteniendo token de autenticación:', error);
      throw new Error('Error de autenticación. Por favor inicia sesión nuevamente.');
    }
  }

  /**
   * Validar lista de clientes contra configuración Databricks
   * 
   * @param {string[]} clientIds - Array de IDs de clientes
   * @returns {Promise<{status, validClients, invalidClients, message}>}
   */
  async validateClients(clientIds) {
    try {
      console.log('[IPP Service] Validando clientes:', clientIds);
      
      const response = await fetch(`${this.baseURL}/ipp/validate-clients`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ clients: clientIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[IPP Service] Resultado de validación:', data);
      
      return data;
    } catch (error) {
      console.error('[IPP Service] Error validando clientes:', error);
      throw error;
    }
  }

  /**
   * Iniciar proceso IPP (trigger Databricks Job 1)
   * 
   * @param {string[]} clientIds - Array de IDs de clientes validados
   * @returns {Promise<{job_id, status, message}>}
   */
  async initiateIPPProcess(clientIds) {
    try {
      console.log('[IPP Service] Iniciando proceso IPP para clientes:', clientIds);
      
      const response = await fetch(`${this.baseURL}/ipp/start`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ clients: clientIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[IPP Service] Proceso IPP iniciado:', data);
      
      return data;
    } catch (error) {
      console.error('[IPP Service] Error iniciando proceso IPP:', error);
      throw error;
    }
  }

  /**
   * Consultar estado del proceso IPP
   * 
   * @param {string} jobId - ID del proceso IPP
   * @returns {Promise<{job_id, status, message, progress?, factor_results?}>}
   */
  async checkProcessStatus(jobId) {
    try {
      console.log('[IPP Service] Consultando estado del proceso:', jobId);
      
      const response = await fetch(`${this.baseURL}/ipp/status/${jobId}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[IPP Service] Estado del proceso:', data);
      
      return data;
    } catch (error) {
      console.error('[IPP Service] Error consultando estado:', error);
      throw error;
    }
  }

  /**
   * Obtener resultados finales del proceso IPP
   * 
   * @param {string} jobId - ID del proceso IPP
   * @returns {Promise<object>}
   */
  async getResults(jobId) {
    try {
      console.log('[IPP Service] Obteniendo resultados del proceso:', jobId);
      
      const response = await fetch(`${this.baseURL}/ipp/results/${jobId}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[IPP Service] Resultados obtenidos:', data);
      
      return data;
    } catch (error) {
      console.error('[IPP Service] Error obteniendo resultados:', error);
      throw error;
    }
  }

  /**
   * Obtener texto legible del estado
   * 
   * @param {string} status - Estado del proceso
   * @returns {string}
   */
  getReadableStatus(status) {
    const statusMap = {
      'validating': 'Validando clientes...',
      'job1_running': 'Databricks: Procesando IPP Tradicional...',
      'completed': 'Databricks completado',
      'factor_initiated': 'Factor de Redondeo: Iniciado',
      'factor_processing': 'Factor de Redondeo: Procesando clientes...',
      'factor_completed': 'Proceso completado',
      'failed': 'Proceso fallido'
    };

    return statusMap[status] || 'Procesando...';
  }
}

// Exportar instancia única (singleton)
const ippService = new IPPService();
export default ippService;

