import React from 'react';
import { Card, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { PROCESS_STATES } from '../constants/processStates';

/**
 * Componente para mostrar el estado del procesamiento
 */
const ProcessingStatus = ({ 
  loading, 
  progress, 
  stage, 
  details, 
  status, 
  processId, 
  error,
  isCompleted,
  hasFailed 
}) => {
  if (!loading && !isCompleted && !hasFailed) {
    return null;
  }

  return (
    <Card className="mb-4">
      <Card.Header className={`text-white ${
        hasFailed ? 'bg-danger' : 
        isCompleted ? 'bg-success' : 
        'bg-info'
      }`}>
        <div className="d-flex align-items-center">
          {loading && !isCompleted && !hasFailed && (
            <Spinner animation="border" size="sm" className="me-2" />
          )}
          {isCompleted && <FaCheckCircle className="me-2" />}
          {hasFailed && <FaExclamationTriangle className="me-2" />}
          
          <h5 className="mb-0">
            {hasFailed ? 'Error en Procesamiento' :
             isCompleted ? 'Procesamiento Completado' :
             'Procesamiento en Curso'}
          </h5>
        </div>
      </Card.Header>
      
      <Card.Body>
        {/* ID del proceso */}
        {processId && (
          <div className="mb-3">
            <small className="text-muted">
              <strong>ID del proceso:</strong> {processId}
            </small>
          </div>
        )}

        {/* Barra de progreso */}
        {!hasFailed && (
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-2">
              <span>{stage}</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar 
              now={progress} 
              variant={isCompleted ? 'success' : 'info'}
              animated={!isCompleted}
            />
          </div>
        )}

        {/* Detalles del estado */}
        {details && (
          <Alert variant="info" className="mb-3">
            <small>{details}</small>
          </Alert>
        )}

        {/* Estado específico para multi-cliente */}
        {status === PROCESS_STATES.PROCESSING_MULTI && (
          <Alert variant="warning">
            <strong>🔄 Procesamiento Multi-Cliente en Curso</strong>
            <p className="mb-0 mt-2">
              Se detectaron múltiples clientes en el archivo. Cada cliente se está 
              procesando por separado y luego se consolidarán los resultados.
            </p>
          </Alert>
        )}

        {status === PROCESS_STATES.AGGREGATING && (
          <Alert variant="info">
            <strong>📊 Consolidando Resultados</strong>
            <p className="mb-0 mt-2">
              Agregando y consolidando los resultados de todos los clientes procesados.
            </p>
          </Alert>
        )}

        {status === PROCESS_STATES.COMPLETED_WITH_WARNINGS && (
          <Alert variant="warning">
            <strong>⚠️ Completado con Advertencias</strong>
            <p className="mb-0 mt-2">
              El procesamiento se completó pero algunos clientes tuvieron errores. 
              Revisa el reporte consolidado para más detalles.
            </p>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="danger">
            <strong>❌ Error:</strong> {error}
          </Alert>
        )}

        {/* Estado de éxito */}
        {isCompleted && !error && (
          <Alert variant="success">
            <strong>Procesamiento Completado Exitosamente</strong>
            <p className="mb-0 mt-2">
              El archivo ha sido procesado correctamente. Los resultados están disponibles abajo.
            </p>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProcessingStatus;
