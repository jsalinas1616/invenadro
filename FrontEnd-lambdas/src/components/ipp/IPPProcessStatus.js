import React from 'react';
import { Card, ProgressBar, Badge, Alert, Spinner, Button } from 'react-bootstrap';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaClock, FaExternalLinkAlt } from 'react-icons/fa';

/**
 * IPPProcessStatus - Componente para mostrar el estado del proceso IPP
 * 
 * Props:
 * - processId: string
 * - status: string ('validating', 'job1_running', 'completed', 'factor_initiated', 'factor_processing', 'factor_completed', 'failed')
 * - result: object | null
 * - databricksRunUrl: string | null
 */
function IPPProcessStatus({ processId, status, result, databricksRunUrl }) {
  // Mapeo de estados a porcentajes de progreso
  const progressMap = {
    'validating': { percent: 5, label: 'Validando clientes...' },
    'job1_queued': { percent: 15, label: 'Databricks: En cola, esperando recursos...' },
    'job1_running': { percent: 35, label: 'Databricks: Ejecutando IPP Tradicional + Normalización...' },
    'completed': { percent: 50, label: 'Databricks completado, preparando Factor de Redondeo...' },
    'factor_initiated': { percent: 60, label: 'Factor de Redondeo: Iniciado...' },
    'factor_processing': { percent: 80, label: 'Factor de Redondeo: Procesando clientes...' },
    'factor_completed': { percent: 100, label: 'Proceso completado' },
    'failed': { percent: 0, label: 'Proceso fallido' }
  };

  const currentProgress = progressMap[status] || { percent: 0, label: 'Procesando...' };

  return (
    <Card className="shadow-sm">
      <Card.Header style={{ backgroundColor: '#648a26' }} className="text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Estado del Proceso IPP
          </h5>
          <Badge bg="light" text="dark">
            Process ID: {processId}
          </Badge>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Estado actual */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-bold">{currentProgress.label}</span>
            <span className="text-muted">{currentProgress.percent}%</span>
          </div>
          <ProgressBar 
            now={currentProgress.percent} 
            variant={status === 'failed' ? 'danger' : status === 'completed' ? 'success' : 'primary'}
            striped={status !== 'completed' && status !== 'failed'}
            animated={status !== 'completed' && status !== 'failed'}
          />
        </div>

        {/* Botón para ver Job en Databricks */}
        {databricksRunUrl && (
          <div className="mb-4">
            <Button
              variant="outline-primary"
              size="sm"
              href={databricksRunUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d-flex align-items-center gap-2"
            >
              <FaExternalLinkAlt />
              Ver Job en Databricks
            </Button>
          </div>
        )}

        {/* Timeline del proceso */}
        <div className="mb-4">
          <h6 className="text-muted mb-3">Progreso del flujo:</h6>
          <div className="d-flex flex-column gap-2">
            {/* Validación */}
            <div className={`d-flex align-items-center ${['job1_queued', 'job1_running', 'completed', 'factor_initiated', 'factor_processing', 'factor_completed'].includes(status) ? 'text-success' : status === 'validating' ? 'text-primary' : 'text-muted'}`}>
              {['job1_queued', 'job1_running', 'completed', 'factor_initiated', 'factor_processing', 'factor_completed'].includes(status) ? (
                <FaCheckCircle className="me-2" />
              ) : status === 'validating' ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>1. Validación de clientes</span>
            </div>

            {/* Databricks Job 1 */}
            <div className={`d-flex align-items-center ${['completed', 'factor_initiated', 'factor_processing', 'factor_completed'].includes(status) ? 'text-success' : ['job1_queued', 'job1_running'].includes(status) ? 'text-primary' : 'text-muted'}`}>
              {['completed', 'factor_initiated', 'factor_processing', 'factor_completed'].includes(status) ? (
                <FaCheckCircle className="me-2" />
              ) : ['job1_queued', 'job1_running'].includes(status) ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>2. Databricks: IPP Tradicional + Normalización</span>
            </div>

            {/* Bridge Automático */}
            <div className={`d-flex align-items-center ${['factor_processing', 'factor_completed'].includes(status) ? 'text-success' : ['factor_initiated'].includes(status) ? 'text-primary' : 'text-muted'}`}>
              {['factor_processing', 'factor_completed'].includes(status) ? (
                <FaCheckCircle className="me-2" />
              ) : ['completed', 'factor_initiated'].includes(status) ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>3. Preparación para Factor de Redondeo</span>
            </div>

            {/* Factor de Redondeo */}
            <div className={`d-flex align-items-center ${status === 'factor_completed' ? 'text-success' : ['factor_initiated', 'factor_processing'].includes(status) ? 'text-primary' : 'text-muted'}`}>
              {status === 'factor_completed' ? (
                <FaCheckCircle className="me-2" />
              ) : ['factor_initiated', 'factor_processing'].includes(status) ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>4. Factor de Redondeo (procesando clientes)</span>
            </div>

            {/* Completado */}
            <div className={`d-flex align-items-center ${status === 'factor_completed' ? 'text-success fw-bold' : status === 'failed' ? 'text-danger fw-bold' : 'text-muted'}`}>
              {status === 'factor_completed' ? (
                <FaCheckCircle className="me-2" />
              ) : status === 'failed' ? (
                <FaTimesCircle className="me-2 text-danger" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>5. Proceso finalizado</span>
            </div>
          </div>
        </div>

        {/* Alertas según estado */}
        {status === 'factor_completed' && (
          <Alert variant="success">
            <FaCheckCircle className="me-2" />
            <strong>Proceso completado exitosamente</strong>
            <p className="mb-0 mt-2 small">
              Los resultados del Factor de Redondeo están disponibles para todos los clientes procesados.
            </p>
          </Alert>
        )}

        {status === 'failed' && (
          <Alert variant="danger">
            <FaTimesCircle className="me-2" />
            <strong>Error en el proceso</strong>
            <p className="mb-0 mt-2 small">
              Hubo un error durante el procesamiento. Revisa los logs en AWS CloudWatch.
            </p>
          </Alert>
        )}

        {['validating', 'job1_queued', 'job1_running', 'completed', 'factor_initiated', 'factor_processing'].includes(status) && (
          <Alert variant="info">
            <FaSpinner className="me-2 fa-spin" />
            <strong>Procesamiento en curso...</strong>
            <p className="mb-0 mt-2 small">
              {status === 'job1_queued' ? 
                'El job está en cola esperando recursos de Databricks. Esto puede tardar unos minutos.' :
                'El proceso puede tardar varios minutos. Por favor espera.'}
            </p>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

export default IPPProcessStatus;

