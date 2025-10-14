import React from 'react';
import { 
  Card, 
  Form, 
  Button, 
  Alert, 
  Row, 
  Col 
} from 'react-bootstrap';
import { 
  FaCloudUploadAlt, 
  FaCog 
} from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';

const FileUploadSection = ({ 
  file, 
  setFile, 
  config, 
  setConfig, 
  loading, 
  error, 
  onProcessFile 
}) => {
  // Configuración de Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    }
  });

  return (
    <Row className="g-4">
      {/* Configuración de Parámetros */}
      <Col xs={12} md={4}>
        <Card className="shadow-sm">
          <Card.Header className="bg-light">
            <h6 className="mb-0 text-corporate fw-bold">
              <FaCog className="me-2" />
              Configuración de Parámetros
            </h6>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Joroba (%)</Form.Label>
              <Form.Control
                type="number"
                value={config.joroba}
                onChange={(e) => setConfig(prev => ({ ...prev, joroba: parseFloat(e.target.value) }))}
                placeholder="3.5"
                step="0.1"
                className="form-control-sm"
              />
              <Form.Text className="text-muted small">
                Porcentaje de ajuste joroba
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Días Inversión Deseados</Form.Label>
              <Form.Control
                type="number"
                value={config.diasInversionDeseados}
                onChange={(e) => setConfig(prev => ({ ...prev, diasInversionDeseados: parseFloat(e.target.value) }))}
                placeholder="26.5"
                step="0.5"
                className="form-control-sm"
              />
              <Form.Text className="text-muted small">
                Días objetivo de inversión
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Precio Máximo</Form.Label>
              <Form.Control
                type="number"
                value={config.precioMaximo}
                onChange={(e) => setConfig(prev => ({ ...prev, precioMaximo: parseFloat(e.target.value) }))}
                placeholder="3000"
                step="100"
                className="form-control-sm"
              />
              <Form.Text className="text-muted small">
                Precio máximo considerado Ejemplo: "0 a 3500"
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>
      </Col>

      {/* Cargar Archivo Excel */}
      <Col xs={12} md={8}>
        <Card className="shadow-sm">
          <Card.Header className="bg-light">
            <h6 className="mb-0 text-corporate fw-bold">
              <FaCloudUploadAlt className="me-2" />
              Cargar Archivo Excel - AWS Lambda
            </h6>
          </Card.Header>
          <Card.Body>
            <div
              {...getRootProps()}
              className={`upload-zone p-4 border-2 border-dashed rounded text-center ${
                isDragActive ? 'border-primary bg-light' : 'border-muted'
              }`}
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <input {...getInputProps()} />
              <FaCloudUploadAlt 
                size={48} 
                className={`mb-3 ${isDragActive ? 'text-primary' : 'text-muted'}`} 
              />
              
              {file ? (
                <div>
                  <h6 className="text-success">Archivo seleccionado:</h6>
                  <p className="mb-2">
                    <strong>{file.name}</strong>
                  </p>
                  <p className="small text-muted">
                    Tamaño: {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <h6 className="mb-2">
                    {isDragActive ? 
                      '¡Suelta el archivo aquí!' : 
                      'Arrastra y suelta tu archivo Excel aquí'
                    }
                  </h6>
                  <p className="text-muted small mb-3">
                    o haz clic para seleccionar un archivo
                  </p>
                  <p className="text-muted small">
                    Formatos soportados: .xlsx, .xls
                  </p>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="d-flex justify-content-center gap-2 mt-3">
              <Button 
                variant="success" 
                onClick={onProcessFile}
                disabled={!file || loading}
                className="btn-corporate"
              >
                <FaCloudUploadAlt className="me-2" />
                {loading ? 'Procesando con Lambda...' : 'Procesar con Lambda'}
              </Button>
            </div>

            {/* Error */}
            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default FileUploadSection;
