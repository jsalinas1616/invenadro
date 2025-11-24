import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Nav, 
  Tab, 
  Row, 
  Col 
} from 'react-bootstrap';
import { 
  FaDownload, 
  FaChartLine, 
  FaUsers 
} from 'react-icons/fa';
import AdvancedClientTable from './AdvancedClientTable';

const ResultsTabs = ({ 
  result, 
  processId, 
  onDownloadJSON 
}) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!result) return null;

  return (
    <Card className="shadow">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0 d-flex align-items-center">
            <FaChartLine className="me-2 icon-primary" />
            Resultados del Procesamiento - AWS Lambda
          </h5>
          <Button variant="outline-primary" size="sm" onClick={onDownloadJSON}>
            <FaDownload className="me-1" />
            Descargar JSON
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="summary">
                <FaChartLine className="me-1" />
                Resumen
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="clients">
                <FaUsers className="me-1" />
                Detalles por Cliente
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            {/* Tab de Resumen */}
            <Tab.Pane eventKey="summary">
              {/* Métricas principales */}
              <Row className="g-3 mb-4">
                <Col xs={6} lg={3}>
                  <Card className="text-white h-100" style={{ backgroundColor: '#648a26' }}>
                    <Card.Body className="text-center d-flex flex-column justify-content-center">
                      <h2 className="fw-bold mb-1">
                        {result.registrosTotales?.toLocaleString() || '0'}
                      </h2>
                      <div className="small">Registros Totales</div>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col xs={6} lg={3}>
                  <Card className="text-white h-100" style={{ backgroundColor: '#648a26' }}>
                    <Card.Body className="text-center d-flex flex-column justify-content-center">
                      <h2 className="fw-bold mb-1">
                        {result.registrosMayorCero?.toLocaleString() || '0'}
                      </h2>
                      <div className="small">Registros > 0</div>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col xs={6} lg={3}>
                  <Card className="text-white h-100" style={{ backgroundColor: '#648a26' }}>
                    <Card.Body className="text-center d-flex flex-column justify-content-center">
                      <h2 className="fw-bold mb-1">
                        {result.factorRedondeoEncontrado || '0'}
                      </h2>
                      <div className="small">Factor Óptimo</div>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col xs={6} lg={3}>
                  <Card className="text-white h-100" style={{ backgroundColor: '#648a26' }}>
                    <Card.Body className="text-center d-flex flex-column justify-content-center">
                      <h2 className="fw-bold mb-1">
                        {result.resumenFinal?.tiempoEjecucionMs ? 
                          `${(result.resumenFinal.tiempoEjecucionMs / 1000).toFixed(1)}s` : 
                          'N/A'
                        }
                      </h2>
                      <div className="small">Tiempo de Proceso</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Análisis Financiero */}
              <Card className="mb-3">
                <Card.Header className="bg-light">
                  <h6 className="mb-0 text-primary fw-bold">Análisis Financiero</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col xs={6} lg={3}>
                      <div className="bg-light rounded p-3 text-center">
                        <div className="small text-muted">Monto Venta Mostrador</div>
                        <h6 className="fw-bold mb-0" style={{ color: '#648a26' }}>
                          ${parseFloat(result.resumenFinal?.inversionOriginal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h6>
                      </div>
                    </Col>
                    <Col xs={6} lg={3}>
                      <div className="bg-light rounded p-3 text-center">
                        <div className="small text-muted">Inversión Deseada</div>
                        <h6 className="fw-bold mb-0" style={{ color: '#648a26' }}>
                          ${parseFloat(result.resumenFinal?.inversionDeseada || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h6>
                      </div>
                    </Col>
                    <Col xs={6} lg={3}>
                      <div className="bg-light rounded p-3 text-center">
                        <div className="small text-muted">Resultado Monto Algoritmo</div>
                        <h6 className="fw-bold mb-0" style={{ color: '#648a26' }}>
                          ${parseFloat(result.resumenFinal?.sumaTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h6>
                      </div>
                    </Col>
                    <Col xs={6} lg={3}>
                      <div className="bg-light rounded p-3 text-center">
                        <div className="small text-muted">Diferencia Final</div>
                        <h6 className="fw-bold mb-0" style={{ color: '#648a26' }}>
                          ${(() => {
                            const inversionDeseada = parseFloat(result.resumenFinal?.inversionDeseada) || 0;
                            const ResultadoMontoAlgoritmo = parseFloat(result.resumenFinal?.sumaTotal) || 0;
                            const diferencia = Math.abs(inversionDeseada - ResultadoMontoAlgoritmo);
                            return diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </h6>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* Tab de Detalles por Cliente */}
            <Tab.Pane eventKey="clients">
              <AdvancedClientTable 
                result={result}
                processId={processId}
              />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Card.Body>
    </Card>
  );
};

export default ResultsTabs;
