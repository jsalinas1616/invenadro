import React, { useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import ClientInputForm from '../components/ipp/ClientInputForm';
import ClientValidationTable from '../components/ipp/ClientValidationTable';
import ValidationWarningModal from '../components/ipp/ValidationWarningModal';
import IPPProcessStatus from '../components/ipp/IPPProcessStatus';

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

  // Handler: Usuario envía lista de clientes
  const handleValidateClients = async (clientList) => {
    console.log('IPPPage: Validando clientes:', clientList);
    setIsValidating(true);
    setError(null);
    
    try {
      // TODO: Llamar a Lambda Verificador IPP
      // const result = await ippService.validateClients(clientList);
      
      // Mock temporal para desarrollo
      const mockResult = {
        status: 'partial_valid',
        validClients: clientList.slice(0, Math.floor(clientList.length * 0.7)),
        invalidClients: clientList.slice(Math.floor(clientList.length * 0.7)),
        message: `${Math.floor(clientList.length * 0.7)} de ${clientList.length} clientes tienen configuración`
      };
      
      setValidationResult(mockResult);
      setClients(clientList);
      
      // Si hay clientes sin config, mostrar modal de advertencia
      if (mockResult.status === 'partial_valid' || mockResult.status === 'all_invalid') {
        setShowWarningModal(true);
      } else {
        // Todos válidos, continuar automáticamente
        handleContinueWithValidClients(mockResult.validClients);
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
      // TODO: Llamar a Lambda Iniciador IPP (trigger Job 1)
      // const response = await ippService.initiateIPPProcess(validClientsList);
      
      // Mock temporal
      console.log('Iniciando proceso IPP con clientes:', validClientsList);
      setIppStatus('validating');
      
    } catch (err) {
      console.error('Error iniciando proceso IPP:', err);
      setError(`Error al iniciar proceso IPP: ${err.message}`);
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

