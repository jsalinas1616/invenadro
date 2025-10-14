/**
 * Configuration Section Component
 * @module components/forms/ConfigSection
 */

import React from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';
import { FaCog } from 'react-icons/fa';

/**
 * Configuration form section for processing parameters
 * @param {Object} props - Component props
 * @param {Object} props.config - Current configuration values
 * @param {Function} props.onConfigChange - Configuration change handler
 * @returns {JSX.Element} ConfigSection component
 */
const ConfigSection = ({ config, onConfigChange }) => {
  /**
   * Handle configuration field changes
   * @param {string} field - Configuration field name
   * @returns {Function} Change handler function
   */
  const handleConfigChange = (field) => (e) => {
    const value = field === 'precioMaximo' 
      ? parseInt(e.target.value) || 0
      : parseFloat(e.target.value) || 0;
    
    onConfigChange({ ...config, [field]: value });
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-light">
        <h6 className="mb-0 d-flex align-items-center">
          <FaCog className="me-2 icon-primary" />
          Configuración de Parámetros
        </h6>
      </Card.Header>
      
      <Card.Body>
        <Form>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Joroba (%)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={config.joroba}
                  onChange={handleConfigChange('joroba')}
                />
                <Form.Text className="text-muted">
                  Porcentaje de ajuste joroba
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Días Inversión Deseados</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  min="1"
                  value={config.diasInversionDeseados}
                  onChange={handleConfigChange('diasInversionDeseados')}
                />
                <Form.Text className="text-muted">
                  Días objetivo de inversión
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Precio Máximo</Form.Label>
                <Form.Control
                  type="number"
                  step="100"
                  min="0"
                  value={config.precioMaximo}
                  onChange={handleConfigChange('precioMaximo')}
                />
                <Form.Text className="text-muted">
                  Precio máximo considerado Ejemplo: "0 a 3500"
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ConfigSection;
