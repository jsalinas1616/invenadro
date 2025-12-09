import React from 'react';
import { Card, Table, Badge, Button, Row, Col, Alert } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaArrowRight, FaRedo } from 'react-icons/fa';

/**
 * ClientValidationTable - Tabla que muestra resultados de validación de clientes
 * 
 * Props:
 * - validationResult: { status, validClients, invalidClients, message }
 * - onContinue: () => void
 * - onReset: () => void
 */
function ClientValidationTable({ validationResult, onContinue, onReset }) {
  if (!validationResult) {
    return null;
  }

  const { status, validClients = [], invalidClients = [], message } = validationResult;
  
  const totalClients = validClients.length + invalidClients.length;
  const validPercentage = totalClients > 0 ? (validClients.length / totalClients) * 100 : 0;

  // Determinar variante de alerta según estado
  const getAlertVariant = () => {
    if (status === 'all_valid') return 'success';
    if (status === 'all_invalid') return 'danger';
    return 'warning';
  };

  return (
    <Card className="shadow-sm">
      <Card.Header style={{ backgroundColor: '#648a26' }} className="text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Resultados de Validación
          </h5>
          <Badge bg="light" text="dark">
            {validClients.length} de {totalClients} válidos ({validPercentage.toFixed(0)}%)
          </Badge>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Resumen */}
        <Alert variant={getAlertVariant()} className="mb-4">
          <div className="d-flex align-items-center">
            {status === 'all_valid' && <FaCheckCircle size={24} className="me-3" />}
            {status === 'all_invalid' && <FaTimesCircle size={24} className="me-3" />}
            <div>
              <strong>{message}</strong>
              {invalidClients.length > 0 && (
                <p className="mb-0 mt-2 small">
                  {invalidClients.length} cliente{invalidClients.length !== 1 ? 's' : ''} no {invalidClients.length !== 1 ? 'tienen' : 'tiene'} configuración en Databricks. 
                  Puedes continuar solo con los clientes válidos o editar la lista.
                </p>
              )}
            </div>
          </div>
        </Alert>

        {/* Estadísticas */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className="h-100 border-success">
              <Card.Body className="text-center">
                <FaCheckCircle size={32} className="text-success mb-2" />
                <h2 className="fw-bold text-success mb-1">{validClients.length}</h2>
                <p className="text-muted mb-0">Clientes con Configuración</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="h-100 border-danger">
              <Card.Body className="text-center">
                <FaTimesCircle size={32} className="text-danger mb-2" />
                <h2 className="fw-bold text-danger mb-1">{invalidClients.length}</h2>
                <p className="text-muted mb-0">Clientes sin Configuración</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Tabla de clientes */}
        <div className="table-responsive mb-4">
          <Table hover>
            <thead className="table-light">
              <tr>
                <th style={{ width: '60%' }}>Cliente ID</th>
                <th style={{ width: '40%' }} className="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {/* Clientes válidos */}
              {validClients.map((clientId) => (
                <tr key={`valid-${clientId}`}>
                  <td>
                    <strong>{clientId}</strong>
                  </td>
                  <td className="text-center">
                    <Badge bg="success" className="d-flex align-items-center justify-content-center gap-1">
                      <FaCheckCircle size={12} />
                      Configurado
                    </Badge>
                  </td>
                </tr>
              ))}
              
              {/* Clientes inválidos */}
              {invalidClients.map((clientId) => (
                <tr key={`invalid-${clientId}`}>
                  <td>
                    <strong>{clientId}</strong>
                  </td>
                  <td className="text-center">
                    <Badge bg="danger" className="d-flex align-items-center justify-content-center gap-1">
                      <FaTimesCircle size={12} />
                      Sin configuración
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* Acciones */}
        <Row>
          <Col md={6} className="mb-2 mb-md-0">
            <Button
              variant="outline-secondary"
              size="lg"
              onClick={onReset}
              className="w-100 d-flex align-items-center justify-content-center"
            >
              <FaRedo className="me-2" />
              Editar Lista
            </Button>
          </Col>
          <Col md={6}>
            <Button
              variant="primary"
              size="lg"
              onClick={onContinue}
              disabled={validClients.length === 0}
              className="w-100 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: '#648a26', borderColor: '#648a26' }}
            >
              <FaArrowRight className="me-2" />
              Continuar con {validClients.length} Cliente{validClients.length !== 1 ? 's' : ''}
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export default ClientValidationTable;

