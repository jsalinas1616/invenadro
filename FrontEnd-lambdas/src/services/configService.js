// Servicio para CRUD de Configuraciones de Mostrador
import { fetchAuthSession } from 'aws-amplify/auth';
import { getConfig } from '../config/environments';

// Obtener configuración del ambiente actual
const env = getConfig();

class ConfigService {
  constructor() {
    this.baseURL = env.apiGateway.url;
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
      console.error('Error obteniendo headers de autenticación:', error);
      throw error;
    }
  }

  /**
   * Crear nueva configuración de mostrador
   */
  async createConfig(configData) {
    try {
      console.log('📝 Creando configuración:', configData);
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/configuraciones`, {
        method: 'POST',
        headers,
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear configuración');
      }

      const result = await response.json();
      console.log('✅ Configuración creada:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error creando configuración:', error);
      throw error;
    }
  }

  /**
   * Obtener configuraciones con paginación y filtros
   * @param {Object} options - Opciones de paginación y filtros
   * @param {number} options.page - Número de página (empezando en 1)
   * @param {number} options.pageSize - Cantidad de registros por página (50 o 100)
   * @param {string} options.search - Término de búsqueda
   * @param {string} options.tipo - Filtro por tipo (SPP/IPP/all)
   */
  async getAllConfigs(options = {}) {
    try {
      const { page = 1, pageSize = 50, search = '', tipo = '' } = options;
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('pageSize', pageSize);
      if (search) queryParams.append('search', search);
      if (tipo && tipo !== 'all') queryParams.append('tipo', tipo);
      
      console.log('📋 Obteniendo configuraciones...', { page, pageSize, search, tipo });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/configuraciones?${queryParams.toString()}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener configuraciones');
      }

      const result = await response.json();
      console.log(`✅ ${result.configs.length} de ${result.pagination.total} configuraciones obtenidas`);
      return result;
      
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración específica por ID
   */
  async getConfigById(mostradorId) {
    try {
      console.log(`🔍 Obteniendo configuración: ${mostradorId}`);
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/configuraciones/${mostradorId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Configuración no encontrada');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener configuración');
      }

      const result = await response.json();
      console.log('✅ Configuración obtenida:', result);
      return result.config;
      
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración existente
   */
  async updateConfig(mostradorId, configData) {
    try {
      console.log(`📝 Actualizando configuración: ${mostradorId}`, configData);
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/configuraciones/${mostradorId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar configuración');
      }

      const result = await response.json();
      console.log('✅ Configuración actualizada:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      throw error;
    }
  }

  /**
   * Eliminar configuración
   */
  async deleteConfig(mostradorId) {
    try {
      console.log(`🗑️ Eliminando configuración: ${mostradorId}`);
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/configuraciones/${mostradorId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar configuración');
      }

      const result = await response.json();
      console.log('✅ Configuración eliminada:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error eliminando configuración:', error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
const configService = new ConfigService();
export default configService;

