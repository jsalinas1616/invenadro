/**
 * Metrics Cards Component - Enterprise Grade
 * @module components/results/MetricsCards
 */

import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { COLORS } from '../../constants/config';
import { formatNumber } from '../../utils/formatters';

/**
 * Metrics cards displaying key performance indicators
 * @param {Object} props - Component props
 * @param {Object} props.result - Processing result data
 * @returns {JSX.Element} MetricsCards component
 */
const MetricsCards = ({ result }) => {
  if (!result) return null;

  const metrics = [
    {
      value: formatNumber(result.registrosTotales || 0),
      label: 'Registros Totales',
      color: COLORS.PRIMARY
    },
    {
      value: formatNumber(result.registrosMayorCero || 0),
      label: 'Registros > 0',
      color: COLORS.SECONDARY
    },
    {
      value: result.factorRedondeoEncontrado || '0',
      label: 'Factor Óptimo',
      color: COLORS.DARK
    },
    {
      value: `${((result.resumenFinal?.tiempoEjecucionMs || 0) / 1000).toFixed(1)}s`,
      label: 'Tiempo de Proceso',
      color: COLORS.LIGHT
    }
  ];

  return (
    <Row className="g-3 mb-4">
      {metrics.map((metric, index) => (
        <Col xs={6} lg={3} key={index}>
          <Card 
            className="text-white h-100" 
            style={{ backgroundColor: metric.color }}
          >
            <Card.Body className="text-center d-flex flex-column justify-content-center">
              <h2 className="fw-bold mb-1">
                {metric.value}
              </h2>
              <div className="small">{metric.label}</div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default MetricsCards;
