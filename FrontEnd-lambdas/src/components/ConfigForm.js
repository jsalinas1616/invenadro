import React from 'react';
import { Card, Form, Row, Col, Alert } from 'react-bootstrap';
import { FaCog } from 'react-icons/fa';

/**
 * Componente para la configuración de parámetros del algoritmo
 */
const ConfigForm = ({ config, onChange }) => {
  const handleChange = (field, value) => {
    onChange(field, parseFloat(value) || 0);
  };

  return (
    <Card className="mb-4">
      <Card.Header className="bg-secondary text-white">
        <h5 className="mb-0">
          <FaCog className="me-2" />
          Configuración de Parámetros
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Factor de Redondeo</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={config.factorRedondeo}
                onChange={(e) => handleChange('factorRedondeo', e.target.value)}
                placeholder="0.5"
              />
              <Form.Text className="text-muted">
                Factor utilizado para el redondeo de inventario
              </Form.Text>
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Joroba</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={config.joroba}
                onChange={(e) => handleChange('joroba', e.target.value)}
                placeholder="3.5"
              />
              <Form.Text className="text-muted">
                Parámetro de ajuste para la curva de demanda
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Días de Inversión Deseados</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={config.diasInversionDeseados}
                onChange={(e) => handleChange('diasInversionDeseados', e.target.value)}
                placeholder="26.5"
              />
              <Form.Text className="text-muted">
                Objetivo de días de inversión para el inventario
              </Form.Text>
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Días de Inversión del Reporte</Form.Label>
              <Form.Control
                type="number"
                step="1"
                value={config.diasDeInverionReporteSubido}
                onChange={(e) => handleChange('diasDeInverionReporteSubido', e.target.value)}
                placeholder="30"
              />
              <Form.Text className="text-muted">
                Días de inversión actuales según el reporte
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Precio Máximo</Form.Label>
              <Form.Control
                type="number"
                step="100"
                value={config.precioMaximo}
                onChange={(e) => handleChange('precioMaximo', e.target.value)}
                placeholder="3000"
              />
              <Form.Text className="text-muted">
                Precio máximo para filtros de productos
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Alert variant="info" className="mt-3">
          <small>
            <strong>💡 Tip:</strong> Los parámetros por defecto están optimizados para la mayoría de casos. 
            Modifica solo si tienes requisitos específicos.
          </small>
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default ConfigForm;
