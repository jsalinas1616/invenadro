import React from 'react';
import { 
  Card, 
  Row, 
  Col 
} from 'react-bootstrap';
import lambdaService from '../services/lambdaService';

const ConfigSidebar = ({ 
  config, 
  processId, 
  status 
}) => {
  return (
    <Col xs={12} md={6}>
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h6 className="mb-0 text-primary fw-bold">Resumen de Configuración</h6>
        </Card.Header>
        <Card.Body>
          <Row className="g-2">
            <Col xs={12} md={6}>
              <strong>Procesado con:</strong> AWS Lambda + Step Functions
            </Col>
            <Col xs={12} md={6}>
              <strong>Process ID:</strong> {processId || 'N/A'}
            </Col>
            <Col xs={12} md={6}>
              <strong>Factor de redondeo inicial:</strong> {config.factorRedondeo}
            </Col>
            <Col xs={12} md={6}>
              <strong>Joroba:</strong> {config.joroba}%
            </Col>
            <Col xs={12} md={6}>
              <strong>Días objetivo:</strong> {config.diasInversionDeseados}
            </Col>
            <Col xs={12} md={6}>
              <strong>Estado final:</strong> {lambdaService.getReadableStatus(status)}
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default ConfigSidebar;
