import React from 'react';
import { Card, ProgressBar, Badge, Alert, Spinner } from 'react-bootstrap';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';

/**
 * IPPProcessStatus - Componente para mostrar el estado del proceso IPP
 * 
 * Props:
 * - processId: string
 * - status: string ('validating', 'job1_running', 'processing', 'job2_running', 'completed', 'failed')
 * - result: object | null
 */
function IPPProcessStatus({ processId, status, result }) {
  // Mapeo de estados a porcentajes de progreso
  const progressMap = {
    'validating': { percent: 5, label: 'Validando clientes...' },
    'job1_running': { percent: 25, label: 'Databricks Job 1: Procesando datos tradicionales...' },
    'processing': { percent: 50, label: 'Aplicando factor de redondeo...' },
    'job2_running': { percent: 75, label: 'Databricks Job 2: Ejecutando Knoblock...' },
    'completed': { percent: 100, label: 'Proceso completado' },
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

        {/* Timeline del proceso */}
        <div className="mb-4">
          <h6 className="text-muted mb-3">Progreso del flujo:</h6>
          <div className="d-flex flex-column gap-2">
            {/* Validación */}
            <div className={`d-flex align-items-center ${['validating', 'job1_running', 'processing', 'job2_running', 'completed'].includes(status) ? 'text-success' : 'text-muted'}`}>
              {['validating', 'job1_running', 'processing', 'job2_running', 'completed'].includes(status) ? (
                <FaCheckCircle className="me-2" />
              ) : status === 'validating' ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>1. Validación de clientes</span>
            </div>

            {/* Job 1 */}
            <div className={`d-flex align-items-center ${['job1_running', 'processing', 'job2_running', 'completed'].includes(status) ? 'text-success' : status === 'validating' ? 'text-muted' : 'text-muted'}`}>
              {['processing', 'job2_running', 'completed'].includes(status) ? (
                <FaCheckCircle className="me-2" />
              ) : status === 'job1_running' ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>2. Databricks Job 1 (Normalizador)</span>
            </div>

            {/* Processing */}
            <div className={`d-flex align-items-center ${['processing', 'job2_running', 'completed'].includes(status) ? 'text-success' : ['validating', 'job1_running'].includes(status) ? 'text-muted' : 'text-muted'}`}>
              {['job2_running', 'completed'].includes(status) ? (
                <FaCheckCircle className="me-2" />
              ) : status === 'processing' ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>3. Aplicación de factor de redondeo</span>
            </div>

            {/* Job 2 */}
            <div className={`d-flex align-items-center ${['job2_running', 'completed'].includes(status) ? 'text-success' : ['validating', 'job1_running', 'processing'].includes(status) ? 'text-muted' : 'text-muted'}`}>
              {status === 'completed' ? (
                <FaCheckCircle className="me-2" />
              ) : status === 'job2_running' ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaClock className="me-2" />
              )}
              <span>4. Databricks Job 2 (Knoblock + Resultados)</span>
            </div>

            {/* Completado */}
            <div className={`d-flex align-items-center ${status === 'completed' ? 'text-success fw-bold' : 'text-muted'}`}>
              {status === 'completed' ? (
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
        {status === 'completed' && (
          <Alert variant="success">
            <FaCheckCircle className="me-2" />
            <strong>Proceso completado exitosamente</strong>
            <p className="mb-0 mt-2 small">
              Los resultados están disponibles para consulta en Databricks.
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

        {['validating', 'job1_running', 'processing', 'job2_running'].includes(status) && (
          <Alert variant="info">
            <FaSpinner className="me-2 fa-spin" />
            <strong>Procesamiento en curso...</strong>
            <p className="mb-0 mt-2 small">
              El proceso puede tardar varios minutos. Por favor espera.
            </p>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

export default IPPProcessStatus;

