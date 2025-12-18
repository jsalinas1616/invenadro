import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import ClientInputForm from '../components/ipp/ClientInputForm';
import ClientValidationTable from '../components/ipp/ClientValidationTable';
import ValidationWarningModal from '../components/ipp/ValidationWarningModal';
import IPPProcessStatus from '../components/ipp/IPPProcessStatus';
import IPPFactorResults from '../components/ipp/IPPFactorResults';
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
  const [factorResults, setFactorResults] = useState(null);
  const [databricksRunUrl, setDatabricksRunUrl] = useState(null);
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
        console.log('============ [IPPPage] POLLING STATUS ============');
        console.log('[IPPPage] Job ID:', jobId);
        console.log('[IPPPage] Status recibido:', statusResponse.status);
        console.log('[IPPPage] Factor results en respuesta:', statusResponse.factor_results ? 'SI' : 'NO');
        if (statusResponse.factor_results) {
          console.log('[IPPPage] Factor results:', JSON.stringify(statusResponse.factor_results, null, 2));
        }
        console.log('==================================================');
        
        setIppStatus(statusResponse.status);
        
        // Guardar URL de Databricks si está disponible
        if (statusResponse.databricks_run_url) {
          setDatabricksRunUrl(statusResponse.databricks_run_url);
        }
        
        // Actualizar resultados del Factor de Redondeo si están disponibles
        if (statusResponse.factor_results) {
          console.log('[IPPPage] Actualizando factorResults state con:', statusResponse.factor_results);
          setFactorResults(statusResponse.factor_results);
        } else {
          console.log('[IPPPage] NO hay factor_results en la respuesta');
        }
        
        // Si el proceso terminó completamente (Factor de Redondeo terminado), detener polling
        if (statusResponse.status === 'factor_completed') {
          console.log('[IPPPage] Proceso completado (Factor de Redondeo), obteniendo resultados...');
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
      // Si todos son válidos, solo mostrar tabla (sin auto-iniciar)
      if (result.status === 'partial_valid' || result.status === 'all_invalid') {
        setShowWarningModal(true);
      }
      // Si todos válidos (all_valid), la tabla se muestra automáticamente
      // y el usuario debe dar clic en "Continuar" manualmente
      
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
      //  Llamar a Lambda Iniciador IPP (trigger Databricks Job 1)
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
    setDatabricksRunUrl(null);
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
              databricksRunUrl={databricksRunUrl}
            />
          </Col>
        </Row>
      )}

      {/* Resultados del Factor de Redondeo */}
      {ippProcessId && (ippStatus === 'completed' || ippStatus === 'factor_initiated' || ippStatus === 'factor_processing' || ippStatus === 'factor_completed') && (
        <Row className="mt-4">
          <Col>
            <IPPFactorResults
              jobId={ippProcessId}
              factorResults={factorResults}
              status={ippStatus}
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

