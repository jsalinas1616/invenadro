/**
 * Financial Analysis Component - Enterprise Grade
 * @module components/results/FinancialAnalysis
 */

import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { formatCurrencyPrecise } from '../../utils/formatters';

/**
 * Financial analysis section with key monetary metrics
 * @param {Object} props - Component props
 * @param {Object} props.result - Processing result data
 * @returns {JSX.Element} FinancialAnalysis component
 */
const FinancialAnalysis = ({ result }) => {
  if (!result?.resumenFinal) return null;

  const { resumenFinal } = result;

  const financialMetrics = [
    {
      label: 'Monto Venta Mostrador',
      value: formatCurrencyPrecise(resumenFinal.inversionOriginal || 0)
    },
    {
      label: 'Inversión Deseada',
      value: formatCurrencyPrecise(resumenFinal.inversionDeseada || 0)
    },
    {
      label: 'Resultado Monto Algoritmo',
      value: formatCurrencyPrecise(resumenFinal.sumaTotal || 0)
    },
    {
      label: 'Diferencia Final',
      value: formatCurrencyPrecise(
        (resumenFinal.sumaTotal || 0) - (resumenFinal.inversionDeseada || 0)
      )
    }
  ];

  return (
    <Card className="mb-3">
      <Card.Header className="bg-light">
        <h6 className="mb-0 text-primary fw-bold">Análisis Financiero</h6>
      </Card.Header>
      
      <Card.Body>
        <Row className="g-3">
          {financialMetrics.map((metric, index) => (
            <Col xs={6} lg={3} key={index}>
              <div className="bg-light rounded p-3 text-center">
                <div className="small text-muted">{metric.label}</div>
                <h6 className="fw-bold mb-0" style={{ color: '#648a26' }}>
                  {metric.value}
                </h6>
              </div>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
};

export default FinancialAnalysis;
