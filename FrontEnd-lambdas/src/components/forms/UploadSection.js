/**
 * Upload Section Component - Enterprise Grade
 * @module components/forms/UploadSection
 */

import React from 'react';
import { Card, Button, ProgressBar } from 'react-bootstrap';
import { FaCloudUploadAlt, FaSpinner } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { formatFileSize } from '../../utils/formatters';

/**
 * File upload section with drag & drop and validation
 * @param {Object} props - Component props
 * @param {Object} props.fileUpload - File upload hook state
 * @param {Object} props.processing - Processing hook state  
 * @param {Function} props.onProcess - Process file handler
 * @returns {JSX.Element} UploadSection component
 */
const UploadSection = ({ fileUpload, processing, onProcess }) => {
  const {
    file,
    isValidating,
    validationError,
    handleFileSelect
  } = fileUpload;

  const {
    isLoading,
    uploadProgress,
    processingStage,
    overallProgress,
    processId
  } = processing;

  // Drag & drop configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await handleFileSelect(acceptedFiles[0]);
      }
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: isLoading
  });

  return (
    <Card className="shadow-sm upload-card">
      <Card.Header className="bg-light">
        <h6 className="mb-0 d-flex align-items-center">
          <FaCloudUploadAlt className="me-2 icon-primary" />
          Cargar Archivo Excel - AWS Lambda
        </h6>
      </Card.Header>
      
      <Card.Body>
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
          style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          <input {...getInputProps()} />
          <FaCloudUploadAlt size={48} className="text-muted mb-3" />
          
          {file ? (
            <div>
              <h6 className="text-corporate mb-2">Archivo seleccionado:</h6>
              <p className="mb-1 fw-bold">{file.name}</p>
              <p className="text-muted small">
                Tamaño: {formatFileSize(file.size)}
              </p>
            </div>
          ) : (
            <div>
              <h6 className="mb-2">
                {isDragActive
                  ? 'Suelta el archivo aquí...'
                  : 'Arrastra y suelta tu archivo Excel aquí'}
              </h6>
              <p className="text-muted mb-2">o haz clic para seleccionar</p>
              <small className="text-muted">
                Formatos soportados: .xlsx, .xls
              </small>
            </div>
          )}
        </div>

        {/* Validation Status */}
        {isValidating && (
          <div className="mt-3 text-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Validando...</span>
            </div>
            <small className="text-muted">Validando archivo...</small>
          </div>
        )}

        {validationError && (
          <div className="mt-3 alert alert-danger">
            <small>{validationError}</small>
          </div>
        )}

        {/* Progress Area */}
        {isLoading && (
          <div className="progress-area mt-3">
            <p className="small text-muted mb-2">
              {processingStage || `Subiendo archivo... ${uploadProgress}%`}
            </p>
            <ProgressBar 
              now={processingStage ? overallProgress : uploadProgress}
              className="mb-2"
              variant="primary"
            />
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                {processingStage ? `${overallProgress}%` : `${uploadProgress}% subido`}
              </small>
            </div>
          </div>
        )}

        {/* Process Status */}
        {processId && (
          <div className="mt-3">
            <Card bg="light">
              <Card.Body className="py-2">
                <small className="text-muted">
                  <strong>Process ID:</strong> {processId}<br/>
                  <strong>Estado:</strong> {processing.status || 'Procesando...'}
                </small>
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="button-area mt-3">
          <div className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={onProcess}
              disabled={!file || isLoading || validationError}
              className="d-flex align-items-center justify-content-center"
            >
              {isLoading ? (
                <FaSpinner className="me-2 fa-spin" />
              ) : (
                <FaCloudUploadAlt className="me-2" />
              )}
              {isLoading ? 'Procesando con AWS...' : 'Procesar con Lambda'}
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default UploadSection;
