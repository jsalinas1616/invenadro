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
   * Obtener todas las configuraciones
   */
  async getAllConfigs() {
    try {
      console.log('📋 Obteniendo todas las configuraciones...');
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/configuraciones`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener configuraciones');
      }

      const result = await response.json();
      console.log(`✅ ${result.count} configuraciones obtenidas`);
      return result.configs;
      
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

