/**
 * Processing hook - NASA/Enterprise grade
 * Handles AWS Lambda processing workflow with robust error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import lambdaService from '../services/lambdaService';
import { POLLING_INTERVAL, PROCESS_STATES } from '../constants/config';
import { validateProcessId } from '../utils/validators';

/**
 * Hook for managing AWS Lambda processing workflow
 * @returns {Object} Processing state and handlers
 */
export const useProcessing = () => {
  // Core state
  const [processId, setProcessId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Progress tracking
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [progressDetails, setProgressDetails] = useState('');

  // Refs for cleanup
  const pollingIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Start processing with file and configuration
   * @param {File} file - File to process
   * @param {Object} config - Processing configuration
   */
  const startProcessing = useCallback(async (file, config) => {
    if (!file) {
      setError('No se ha seleccionado ningún archivo');
      return false;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);
    setProcessingStage('Iniciando procesamiento...');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Initiate processing with AWS Lambda
      setProcessingStage('Iniciando procesamiento con AWS Lambda...');
      console.log('[LAMBDA] Iniciando procesamiento con configuración:', config);
      
      const response = await lambdaService.initiateProcessing(file, config);

      if (response.processId) {
        setProcessId(response.processId);
        setProcessingStage('Archivo subido, iniciando procesamiento...');
        console.log('🚀 Procesamiento iniciado:', response.processId);
        return true;
      } else {
        throw new Error('No se recibió ID de proceso');
      }

    } catch (error) {
      console.error('❌ Error iniciando procesamiento:', error);
      
      if (error.name === 'AbortError') {
        setError('Procesamiento cancelado');
      } else {
        setError(error.message || 'Error al iniciar el procesamiento');
      }
      
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Cancel current processing
   */
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsLoading(false);
    setProcessingStage('');
    setError('Procesamiento cancelado');
  }, []);

  /**
   * Reset processing state
   */
  const resetProcessing = useCallback(() => {
    cancelProcessing();
    
    setProcessId(null);
    setStatus(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    setProcessingStage('');
    setOverallProgress(0);
    setProgressDetails('');
  }, [cancelProcessing]);

  /**
   * Download results as JSON
   */
  const downloadJSON = useCallback(() => {
    if (!result) {
      setError('No hay resultados disponibles para descargar');
      return;
    }

    try {
      const dataStr = JSON.stringify(result, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const fileName = `resultado_optimizacion_${processId || 'lambda'}.json`;
      
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('📥 Descarga JSON exitosa:', fileName);
    } catch (error) {
      console.error('❌ Error descargando JSON:', error);
      setError('Error al descargar los resultados');
    }
  }, [result, processId]);

  /**
   * Poll for processing status
   */
  useEffect(() => {
    if (!processId || !validateProcessId(processId)) {
      return;
    }

    const pollStatus = async () => {
      try {
        const statusData = await lambdaService.getProcessStatus(processId);
        console.log('📊 Estado actual:', statusData);
        
        setStatus(statusData.status);
        
        // Update progress based on status
        switch (statusData.status) {
          case PROCESS_STATES.INITIALIZING:
            setProcessingStage('Inicializando proceso...');
            setOverallProgress(10);
            break;
          case PROCESS_STATES.SEPARATING_CLIENTS:
            setProcessingStage('Analizando y separando clientes...');
            setOverallProgress(25);
            break;
          case PROCESS_STATES.PROCESSING_SINGLE:
          case PROCESS_STATES.PROCESSING_MULTI:
            setProcessingStage('Optimizando factores de redondeo...');
            setOverallProgress(60);
            break;
          case PROCESS_STATES.AGGREGATING:
            setProcessingStage('Consolidando resultados...');
            setOverallProgress(85);
            break;
          case PROCESS_STATES.COMPLETED:
            setProcessingStage('Obteniendo resultados finales...');
            setOverallProgress(95);
            
            // Download final results
            const finalResult = await lambdaService.downloadResult(processId);
            setResult(finalResult);
            setIsLoading(false);
            setOverallProgress(100);
            setProcessingStage('Completado exitosamente');
            
            // Clear polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            console.log('✅ Proceso completado exitosamente');
            break;
            
          case PROCESS_STATES.FAILED:
            setError('El procesamiento falló. Por favor, inténtalo de nuevo.');
            setIsLoading(false);
            
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            break;
            
          default:
            setProcessingStage('Procesando...');
            break;
        }
        
      } catch (error) {
        console.error('❌ Error en polling:', error);
        setError('Error al verificar el estado del procesamiento.');
        setIsLoading(false);
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(pollStatus, POLLING_INTERVAL);
    
    // Initial poll
    pollStatus();

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [processId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    processId,
    status,
    result,
    isLoading,
    error,
    uploadProgress,
    processingStage,
    overallProgress,
    progressDetails,
    
    // Actions
    startProcessing,
    cancelProcessing,
    resetProcessing,
    downloadJSON,
    
    // Computed
    isProcessing: isLoading,
    hasResult: !!result,
    isCompleted: status === PROCESS_STATES.COMPLETED,
    isFailed: status === PROCESS_STATES.FAILED
  };
};