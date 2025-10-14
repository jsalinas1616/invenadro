import React from 'react';
import { 
  Alert, 
  ProgressBar, 
  Col 
} from 'react-bootstrap';
import { 
  FaSpinner 
} from 'react-icons/fa';
import lambdaService from '../services/lambdaService';

const ProcessingStatusSection = ({ 
  loading, 
  status, 
  processId, 
  uploadProgress, 
  processingStage, 
  overallProgress, 
  progressDetails 
}) => {
  // No mostrar nada si no está procesando
  if (!loading && status === 'idle') {
    return null;
  }

  const getStatusMessage = () => {
    if (loading && status === 'idle') {
      return '📤 Subiendo archivo...';
    }
    
    return lambdaService.getReadableStatus(status);
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'RUNNING':
      case 'PROCESSING':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <Col xs={12}>
      <Alert variant={getStatusVariant()} className="mb-4">
        <div className="d-flex align-items-center">
          {(loading || status === 'RUNNING') && (
            <FaSpinner className="fa-spin me-2" />
          )}
          <div className="flex-grow-1">
            <strong>{getStatusMessage()}</strong>
            {processId && (
              <div className="small mt-1">
                Process ID: <code>{processId}</code>
              </div>
            )}
            {progressDetails && (
              <div className="small mt-1">
                {progressDetails}
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar para upload */}
        {loading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-3">
            <div className="small mb-1">Subiendo archivo...</div>
            <ProgressBar 
              now={uploadProgress} 
              label={`${uploadProgress}%`}
              variant="info"
              animated
            />
          </div>
        )}
        
        {/* Progress bar para procesamiento */}
        {(status === 'RUNNING' || status === 'PROCESSING') && overallProgress > 0 && (
          <div className="mt-3">
            <div className="small mb-1">
              {processingStage || 'Procesando...'}
            </div>
            <ProgressBar 
              now={overallProgress} 
              label={`${overallProgress}%`}
              variant="success"
              animated
            />
          </div>
        )}
      </Alert>
    </Col>
  );
};

export default ProcessingStatusSection;
