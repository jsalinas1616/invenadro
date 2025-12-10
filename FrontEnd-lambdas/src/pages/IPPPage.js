import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import ClientInputForm from '../components/ipp/ClientInputForm';
import ClientValidationTable from '../components/ipp/ClientValidationTable';
import ValidationWarningModal from '../components/ipp/ValidationWarningModal';
import IPPProcessStatus from '../components/ipp/IPPProcessStatus';
import ippService from '../services/ippService';

/**
 * IPPPage - Página principal del módulo IPP (Inventario de Precisión Predictiva)
 * 
 * Flujo:
 * 1. Usuario ingresa clientes (manual o CSV)
 * 2. Validar clientes contra configuración Databricks
 * 3. Mostrar warning si algunos no tienen config
 * 4. Continuar con flujo IPP (Job 1, Processor, Job 2)
 */
function IPPPage() {
  // Estados del formulario
  const [clients, setClients] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Estados del proceso IPP
  const [ippProcessId, setIppProcessId] = useState(null);
  const [ippStatus, setIppStatus] = useState('idle');
  const [ippResult, setIppResult] = useState(null);
  const [error, setError] = useState(null);

  // Ref para el intervalo de polling
  const pollingIntervalRef = useRef(null);

  // Cleanup: Detener polling al desmontar componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Función: Iniciar polling automático del estado
  const startStatusPolling = (jobId) => {
    console.log('[IPPPage] Iniciando polling de estado para job:', jobId);
    
    // Detener cualquier polling anterior
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Polling cada 5 segundos
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse = await ippService.checkProcessStatus(jobId);
        console.log('[IPPPage] Estado actualizado:', statusResponse);
        
        setIppStatus(statusResponse.status);
        
        // Si el proceso terminó (success o error), detener polling y obtener resultados
        if (statusResponse.status === 'completed') {
          console.log('[IPPPage] Proceso completado, obteniendo resultados...');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          // Obtener resultados finales
          const results = await ippService.getResults(jobId);
          setIppResult(results);
          
        } else if (statusResponse.status === 'failed') {
          console.error('[IPPPage] Proceso falló');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setError(statusResponse.message || 'El proceso IPP falló. Revisa los logs.');
        }
        
      } catch (err) {
        console.error('[IPPPage] Error en polling de estado:', err);
        // No detener el polling por errores temporales de red
      }
    }, 5000); // 5 segundos
  };

  // Handler: Usuario envía lista de clientes
  const handleValidateClients = async (clientList) => {
    console.log('IPPPage: Validando clientes:', clientList);
    setIsValidating(true);
    setError(null);
    
    try {
      // ✅ Llamar a Lambda Verificador IPP
      const result = await ippService.validateClients(clientList);
      
      console.log('Resultado de validación:', result);
      
      setValidationResult(result);
      setClients(clientList);
      
      // Si hay clientes sin config, mostrar modal de advertencia
      if (result.status === 'partial_valid' || result.status === 'all_invalid') {
        setShowWarningModal(true);
      } else {
        // Todos válidos, continuar automáticamente
        handleContinueWithValidClients(result.validClients);
      }
      
    } catch (err) {
      console.error('Error validando clientes:', err);
      setError(`Error al validar clientes: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Handler: Usuario decide continuar solo con clientes válidos
  const handleContinueWithValidClients = async (validClientsList) => {
    console.log('IPPPage: Continuando con clientes válidos:', validClientsList);
    setShowWarningModal(false);
    
    try {
      // ✅ Llamar a Lambda Iniciador IPP (trigger Databricks Job 1)
      console.log('[IPPPage] Iniciando proceso IPP para clientes:', validClientsList);
      setIppStatus('initiating');
      
      const response = await ippService.initiateIPPProcess(validClientsList);
      
      console.log('[IPPPage] Proceso IPP iniciado:', response);
      
      // Guardar job_id y estado inicial
      setIppProcessId(response.job_id);
      setIppStatus(response.status); // 'job1_running' | 'failed' | etc.
      
      // Iniciar polling automático del estado
      if (response.status !== 'failed') {
        startStatusPolling(response.job_id);
      }
      
    } catch (err) {
      console.error('[IPPPage] Error iniciando proceso IPP:', err);
      setError(`Error al iniciar proceso IPP: ${err.message}`);
      setIppStatus('failed');
    }
  };

  // Handler: Usuario cancela y quiere editar lista
  const handleCancelAndEdit = () => {
    console.log('IPPPage: Usuario canceló, volviendo a formulario');
    setShowWarningModal(false);
    setValidationResult(null);
    // El formulario mantiene los valores para que usuario pueda editar
  };

  // Handler: Reset completo
  const handleReset = () => {
    setClients([]);
    setValidationResult(null);
    setShowWarningModal(false);
    setIppProcessId(null);
    setIppStatus('idle');
    setIppResult(null);
    setError(null);
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="text-corporate fw-bold">
            Farmacias Independientes - IPP
          </h2>
          <p className="text-muted">
            Inventario de Precisión Predictiva - Validación y procesamiento por cliente
          </p>
        </Col>
      </Row>

      {/* Error global */}
      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Formulario de entrada de clientes */}
      {!ippProcessId && (
        <Row>
          <Col>
            <ClientInputForm
              onValidate={handleValidateClients}
              isValidating={isValidating}
              initialClients={clients}
            />
          </Col>
        </Row>
      )}

      {/* Tabla de validación (después de validar) */}
      {validationResult && !ippProcessId && (
        <Row className="mt-4">
          <Col>
            <ClientValidationTable
              validationResult={validationResult}
              onContinue={() => handleContinueWithValidClients(validationResult.validClients)}
              onReset={handleReset}
            />
          </Col>
        </Row>
      )}

      {/* Estado del proceso IPP */}
      {ippProcessId && (
        <Row className="mt-4">
          <Col>
            <IPPProcessStatus
              processId={ippProcessId}
              status={ippStatus}
              result={ippResult}
            />
          </Col>
        </Row>
      )}

      {/* Modal de advertencia */}
      <ValidationWarningModal
        show={showWarningModal}
        onHide={() => setShowWarningModal(false)}
        validationResult={validationResult}
        onContinue={() => handleContinueWithValidClients(validationResult?.validClients || [])}
        onCancel={handleCancelAndEdit}
      />
    </Container>
  );
}

export default IPPPage;

