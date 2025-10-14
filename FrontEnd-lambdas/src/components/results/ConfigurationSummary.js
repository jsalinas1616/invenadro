/**
 * Configuration Summary Component
 * @module components/results/ConfigurationSummary
 */

import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';

/**
 * Display summary of processing configuration and metadata
 * @param {Object} props - Component props
 * @param {Object} props.config - Processing configuration
 * @param {string} props.processId - Process ID
 * @returns {JSX.Element} ConfigurationSummary component
 */
const ConfigurationSummary = ({ config, processId }) => {
  const summaryItems = [
    { label: 'Procesado con', value: 'AWS Lambda + Step Functions' },
    { label: 'Process ID', value: processId },
    { label: 'Factor de redondeo inicial', value: config.factorRedondeo || 0.5 },
    { label: 'Joroba', value: `${config.joroba}%` },
    { label: 'Días objetivo', value: config.diasInversionDeseados },
    { label: 'Estado final', value: 'Completado' }
  ];

  return (
    <Card>
      <Card.Header className="bg-light">
        <h6 className="mb-0 text-info fw-bold">Resumen de Configuración</h6>
      </Card.Header>
      
      <Card.Body>
        <Row className="g-3">
          {summaryItems.map((item, index) => (
            <Col xs={12} md={6} key={index}>
              <div>
                <strong>{item.label}:</strong> {item.value}
              </div>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ConfigurationSummary;
