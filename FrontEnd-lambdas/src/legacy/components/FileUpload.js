import React from 'react';
import { Card, Button, Alert, Spinner } from 'react-bootstrap';
import { FaCloudUploadAlt, FaFile, FaTimes, FaUsers, FaUser } from 'react-icons/fa';
import { formatFileSize } from '../utils/formatters';

/**
 * Componente para la carga y validación de archivos Excel
 */
const FileUpload = ({ 
  file, 
  validationResult, 
  clientsInfo, 
  validating, 
  error, 
  isDragActive, 
  dropzoneProps, 
  onClearFile 
}) => {
  const { getRootProps, getInputProps } = dropzoneProps;

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">
          <FaCloudUploadAlt className="me-2" />
          Cargar Archivo Excel
        </h5>
      </Card.Header>
      <Card.Body>
        {!file ? (
          <div
            {...getRootProps()}
            className={`dropzone p-4 border-2 border-dashed rounded text-center ${
              isDragActive ? 'border-primary bg-light' : 'border-secondary'
            }`}
            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
          >
            <input {...getInputProps()} />
            <FaCloudUploadAlt size={48} className="text-muted mb-3" />
            <p className="mb-2">
              {isDragActive
                ? 'Suelta el archivo aquí...'
                : 'Arrastra un archivo Excel aquí, o haz clic para seleccionar'}
            </p>
            <small className="text-muted">
              Archivos permitidos: .xlsx, .xls (máximo 50MB)
            </small>
          </div>
        ) : (
          <div>
            {/* Información del archivo */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center">
                <FaFile className="text-success me-2" />
                <div>
                  <strong>{file.name}</strong>
                  <br />
                  <small className="text-muted">{formatFileSize(file.size)}</small>
                </div>
              </div>
              <Button variant="outline-danger" size="sm" onClick={onClearFile}>
                <FaTimes />
              </Button>
            </div>

            {/* Estado de validación */}
            {validating && (
              <Alert variant="info" className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                Validando archivo...
              </Alert>
            )}

            {/* Errores de validación */}
            {error && (
              <Alert variant="danger">
                <strong>Error:</strong> {error}
              </Alert>
            )}

            {/* Resultado de validación exitosa */}
            {validationResult?.esValido && (
              <div>
                <Alert variant="success">
                  <strong>✅ Archivo válido</strong>
                  <ul className="mb-0 mt-2">
                    <li>Columnas: {validationResult.totalColumnas}</li>
                    <li>Registros: {validationResult.totalRegistros}</li>
                    <li>Precio: {validationResult.tienePrecio ? '✅' : '❌'}</li>
                    <li>Inversión: {validationResult.tieneInversion ? '✅' : '❌'}</li>
                  </ul>
                </Alert>

                {/* Información de clientes */}
                {clientsInfo && (
                  <Alert 
                    variant={clientsInfo.esMultiCliente ? "warning" : "info"}
                    className="d-flex align-items-center"
                  >
                    {clientsInfo.esMultiCliente ? (
                      <FaUsers className="me-2" />
                    ) : (
                      <FaUser className="me-2" />
                    )}
                    <div>
                      <strong>
                        {clientsInfo.esMultiCliente 
                          ? `Múltiples clientes detectados (${clientsInfo.totalClientes})`
                          : 'Cliente único detectado'
                        }
                      </strong>
                      {clientsInfo.esMultiCliente && (
                        <div className="mt-1">
                          <small>
                            El archivo será procesado por separado para cada cliente y 
                            luego se consolidarán los resultados.
                          </small>
                        </div>
                      )}
                    </div>
                  </Alert>
                )}
              </div>
            )}

            {/* Errores específicos de validación */}
            {validationResult && !validationResult.esValido && (
              <Alert variant="danger">
                <strong>❌ Archivo inválido</strong>
                {validationResult.columnasFaltantes?.length > 0 && (
                  <div className="mt-2">
                    <strong>Columnas faltantes:</strong>
                    <ul className="mb-0">
                      {validationResult.columnasFaltantes.map((col, idx) => (
                        <li key={idx}>{col}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Alert>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default FileUpload;
