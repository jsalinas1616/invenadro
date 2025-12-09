import React from 'react';
import { Modal, Button, Badge, ListGroup, Alert } from 'react-bootstrap';
import { FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

/**
 * ValidationWarningModal - Modal de advertencia cuando hay clientes sin configuración
 * 
 * Props:
 * - show: boolean
 * - onHide: () => void
 * - validationResult: { status, validClients, invalidClients }
 * - onContinue: () => void
 * - onCancel: () => void
 */
function ValidationWarningModal({ show, onHide, validationResult, onContinue, onCancel }) {
  if (!validationResult) {
    return null;
  }

  const { validClients = [], invalidClients = [] } = validationResult;
  const totalClients = validClients.length + invalidClients.length;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
    >
      <Modal.Header style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
        <Modal.Title className="d-flex align-items-center text-warning">
          <FaExclamationTriangle size={28} className="me-3" />
          Advertencia: Clientes sin Configuración
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Alert variant="warning" className="mb-4">
          <strong>
            {invalidClients.length} de {totalClients} clientes no tienen configuración en Databricks.
          </strong>
          <p className="mb-0 mt-2 small">
            Estos clientes serán excluidos del proceso IPP. Solo se procesarán los clientes con configuración válida.
          </p>
        </Alert>

        {/* Resumen visual */}
        <div className="d-flex gap-3 mb-4">
          <div className="flex-fill p-3 border border-success rounded text-center">
            <FaCheckCircle size={24} className="text-success mb-2" />
            <h4 className="fw-bold text-success mb-1">{validClients.length}</h4>
            <small className="text-muted">Con configuración</small>
          </div>
          <div className="flex-fill p-3 border border-danger rounded text-center">
            <FaTimesCircle size={24} className="text-danger mb-2" />
            <h4 className="fw-bold text-danger mb-1">{invalidClients.length}</h4>
            <small className="text-muted">Sin configuración</small>
          </div>
        </div>

        {/* Lista de clientes sin configuración */}
        <div className="mb-3">
          <h6 className="text-danger fw-bold mb-2">
            <FaTimesCircle className="me-2" />
            Clientes SIN configuración:
          </h6>
          <ListGroup style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {invalidClients.map((clientId) => (
              <ListGroup.Item
                key={clientId}
                className="d-flex justify-content-between align-items-center"
              >
                <span><strong>{clientId}</strong></span>
                <Badge bg="danger">Sin configuración</Badge>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>

        {/* Lista de clientes válidos (colapsada si son muchos) */}
        {validClients.length > 0 && (
          <div className="mb-3">
            <h6 className="text-success fw-bold mb-2">
              <FaCheckCircle className="me-2" />
              Clientes con configuración ({validClients.length}):
            </h6>
            <div 
              className="p-2 bg-light rounded" 
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            >
              <small className="text-muted">
                {validClients.join(', ')}
              </small>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <Alert variant="info" className="mb-0">
          <strong>¿Qué deseas hacer?</strong>
          <ul className="mb-0 mt-2 small">
            <li><strong>Continuar:</strong> Procesar solo los {validClients.length} clientes con configuración</li>
            <li><strong>Cancelar:</strong> Volver y editar la lista de clientes</li>
          </ul>
        </Alert>
      </Modal.Body>
      
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={() => {
            onCancel();
            onHide();
          }}
          size="lg"
        >
          Cancelar y Editar Lista
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onContinue();
            onHide();
          }}
          disabled={validClients.length === 0}
          size="lg"
          style={{ backgroundColor: '#648a26', borderColor: '#648a26' }}
        >
          Continuar con {validClients.length} Cliente{validClients.length !== 1 ? 's' : ''}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ValidationWarningModal;

