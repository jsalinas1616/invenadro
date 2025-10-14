import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { FaCheck, FaClock, FaUsers, FaChartLine } from 'react-icons/fa';
import { formatTime } from '../utils/formatters';

/**
 * Componente para mostrar las métricas principales en cards grandes
 */
const MetricsCards = ({ result, isMultiClient }) => {
  if (!result) return null;

  // Calcular métricas según el tipo de resultado
  const metrics = isMultiClient ? {
    exitosos: result.estadisticasConsolidadas?.clientesExitosos || 0,
    tiempoPromedio: (result.estadisticasConsolidadas?.tiempoProcesamientoTotal || 0) / (result.estadisticasConsolidadas?.clientesExitosos || 1),
    totalClientes: result.estadisticasConsolidadas?.totalClientes || 0,
    factorPromedio: result.estadisticasConsolidadas?.factorPromedioGeneral || 0
  } : {
    exitosos: 1,
    tiempoPromedio: result.tiempoCalculoMs || 0,
    totalClientes: 1,
    factorPromedio: result.configUsada?.factorRedondeo || 0
  };

  return (
    <Row className="mb-4">
      <Col md={6} lg={3} className="mb-3">
        <Card className="metric-card bg-metric-1 text-white h-100">
          <Card.Body className="metric-card-body d-flex flex-column justify-content-center text-center">
            <div className="display-4 mb-2">
              <FaCheck />
            </div>
            <h2 className="display-3 mb-1">{metrics.exitosos}</h2>
            <h6 className="mb-0">Exitosos</h6>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} lg={3} className="mb-3">
        <Card className="metric-card bg-metric-2 text-white h-100">
          <Card.Body className="metric-card-body d-flex flex-column justify-content-center text-center">
            <div className="display-4 mb-2">
              <FaClock />
            </div>
            <h2 className="display-3 mb-1">
              {formatTime(metrics.tiempoPromedio).replace(/\.\d+/, '')}
            </h2>
            <h6 className="mb-0">
              {isMultiClient ? 'Tiempo Promedio/Cliente' : 'Tiempo Total'}
            </h6>
          </Card.Body>
        </Card>
      </Col>

      {isMultiClient && (
        <Col md={6} lg={3} className="mb-3">
          <Card className="metric-card bg-metric-3 text-white h-100">
            <Card.Body className="metric-card-body d-flex flex-column justify-content-center text-center">
              <div className="display-4 mb-2">
                <FaUsers />
              </div>
              <h2 className="display-3 mb-1">{metrics.totalClientes}</h2>
              <h6 className="mb-0">Total Clientes</h6>
            </Card.Body>
          </Card>
        </Col>
      )}

      <Col md={6} lg={3} className="mb-3">
        <Card className="metric-card bg-metric-4 text-white h-100">
          <Card.Body className="metric-card-body d-flex flex-column justify-content-center text-center">
            <div className="display-4 mb-2">
              <FaChartLine />
            </div>
            <h2 className="display-3 mb-1">
              {typeof metrics.factorPromedio === 'number' ? 
                metrics.factorPromedio.toFixed(2) : 
                metrics.factorPromedio
              }
            </h2>
            <h6 className="mb-0">
              {isMultiClient ? 'Factor Promedio' : 'Factor Óptimo'}
            </h6>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default MetricsCards;
