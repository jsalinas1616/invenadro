import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Badge, InputGroup } from 'react-bootstrap';
import { FaUsers, FaFileUpload, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';

/**
 * ClientInputForm - Formulario para ingresar clientes (manual o CSV)
 * 
 * Props:
 * - onValidate: (clientList: string[]) => void
 * - isValidating: boolean
 * - initialClients: string[]
 */
function ClientInputForm({ onValidate, isValidating, initialClients = [] }) {
  const [inputMethod, setInputMethod] = useState('manual'); // 'manual' o 'csv'
  const [manualInput, setManualInput] = useState(initialClients.join(', '));
  const [csvFile, setCsvFile] = useState(null);
  const [parsedClients, setParsedClients] = useState([]);

  // Dropzone para CSV
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setCsvFile(file);
        parseCSVFile(file);
      }
    },
    onDropRejected: () => {
      alert('Por favor, selecciona solo archivos CSV o TXT');
    }
  });

  // Parsear archivo CSV
  const parseCSVFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      // Extraer IDs de clientes (asume una columna o valores separados por líneas)
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      
      // Remover header si existe (asume que header contiene letras)
      const clientIds = lines.filter(line => /^\d+$/.test(line));
      
      console.log('Clientes parseados del CSV:', clientIds);
      setParsedClients(clientIds);
    };
    reader.readAsText(file);
  };

  // Handler: Submit formulario
  const handleSubmit = () => {
    let clientList = [];

    if (inputMethod === 'manual') {
      // Parsear input manual (separados por coma, espacio, o línea nueva)
      clientList = manualInput
        .split(/[,\n\s]+/)
        .map(id => id.trim())
        .filter(id => id && /^\d+$/.test(id)); // Solo números
    } else {
      clientList = parsedClients;
    }

    if (clientList.length === 0) {
      alert('Por favor, ingresa al menos un cliente válido');
      return;
    }

    console.log('Validando clientes:', clientList);
    onValidate(clientList);
  };

  // Contador de clientes parseados
  const clientCount = inputMethod === 'manual'
    ? manualInput.split(/[,\n\s]+/).filter(id => id.trim() && /^\d+$/.test(id.trim())).length
    : parsedClients.length;

  return (
    <Card className="shadow-sm">
      <Card.Header style={{ backgroundColor: '#648a26' }} className="text-white">
        <h5 className="mb-0 d-flex align-items-center">
          <FaUsers className="me-2" />
          Ingresar Clientes para IPP
        </h5>
      </Card.Header>
      <Card.Body>
        {/* Selector de método de entrada */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex gap-3">
              <Form.Check
                type="radio"
                id="manual-input"
                label="Entrada manual"
                checked={inputMethod === 'manual'}
                onChange={() => setInputMethod('manual')}
              />
              <Form.Check
                type="radio"
                id="csv-upload"
                label="Subir CSV"
                checked={inputMethod === 'csv'}
                onChange={() => setInputMethod('csv')}
              />
            </div>
          </Col>
        </Row>

        {/* Input manual */}
        {inputMethod === 'manual' && (
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>
                  IDs de Clientes
                  {clientCount > 0 && (
                    <Badge bg="primary" className="ms-2">
                      {clientCount} cliente{clientCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Ingresa los IDs de clientes separados por coma o línea nueva. Ejemplo:&#10;7051602, 7051603, 7051604&#10;o&#10;7051602&#10;7051603&#10;7051604"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  disabled={isValidating}
                />
                <Form.Text className="text-muted">
                  Puedes ingresar múltiples clientes separados por coma, espacio o línea nueva
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        )}

        {/* Upload CSV */}
        {inputMethod === 'csv' && (
          <Row className="mb-3">
            <Col>
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? '#f0f8ff' : '#f9f9f9'
                }}
              >
                <input {...getInputProps()} />
                <FaFileUpload size={48} className="text-muted mb-3" />
                
                {csvFile ? (
                  <div>
                    <h6 className="text-success mb-2">
                      <FaCheckCircle className="me-2" />
                      Archivo cargado
                    </h6>
                    <p className="mb-1 fw-bold">{csvFile.name}</p>
                    <Badge bg="success" className="mb-2">
                      {parsedClients.length} cliente{parsedClients.length !== 1 ? 's' : ''} detectados
                    </Badge>
                    <p className="text-muted small mb-0">
                      Clientes: {parsedClients.slice(0, 5).join(', ')}
                      {parsedClients.length > 5 && ` y ${parsedClients.length - 5} más...`}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h6 className="mb-2">
                      {isDragActive
                        ? 'Suelta el archivo aquí...'
                        : 'Arrastra y suelta tu archivo CSV aquí'}
                    </h6>
                    <p className="text-muted mb-0">o haz clic para seleccionar</p>
                  </div>
                )}
              </div>
              <Form.Text className="text-muted d-block mt-2">
                <strong>Formato esperado:</strong> Archivo CSV o TXT con un ID de cliente por línea
              </Form.Text>
            </Col>
          </Row>
        )}

        {/* Botón de validación */}
        <Row>
          <Col>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={isValidating || clientCount === 0}
              className="d-flex align-items-center justify-content-center w-100"
              style={{ backgroundColor: '#648a26', borderColor: '#648a26' }}
            >
              {isValidating ? (
                <>
                  <FaSpinner className="me-2 fa-spin" />
                  Validando clientes...
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" />
                  Validar {clientCount} Cliente{clientCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export default ClientInputForm;

