import React from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { FaBuilding, FaDatabase, FaChartLine, FaCog, FaRocket } from 'react-icons/fa';

/**
 * Componente del sidebar con información del cliente y convergencia del algoritmo
 */
const ClientInfoSidebar = ({ result, clientsInfo }) => {
  return (
    <div>
      {/* Información del cliente */}
      <Card className="mb-4">
        <Card.Header className="bg-light">
          <h6 className="mb-0 text-corporate">
            <FaBuilding className="me-2" />
            Información del cliente
          </h6>
        </Card.Header>
        <Card.Body>
          <div className="mb-4">
            <h6 className="text-muted mb-2">Datos de la farmacia</h6>
            <p className="mb-1">
              <strong>Número de cliente:</strong>
            </p>
            <p className="text-muted small">
              {clientsInfo?.totalClientes > 1 
                ? `${clientsInfo.totalClientes} clientes detectados`
                : 'Cliente único'
              }
            </p>
          </div>
        </Card.Body>
      </Card>

      {/* Convergencia del algoritmo */}
      <Card>
        <Card.Header className="bg-light">
          <h6 className="mb-0 text-corporate">
            <FaChartLine className="me-2" />
            CONVERGENCIA DEL ALGORITMO
          </h6>
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item className="px-0 border-0">
              <div className="d-flex align-items-center">
                <FaRocket className="text-primary me-2" />
                <div>
                  <strong>Arquitectura AWS Lambda:</strong>
                  <div className="text-muted small">
                    Procesamiento escalable y serverless
                  </div>
                </div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="px-0 border-0">
              <div className="d-flex align-items-center">
                <FaCog className="text-success me-2" />
                <div>
                  <strong>Step Functions:</strong>
                  <div className="text-muted small">
                    Orquestación automática de procesos
                  </div>
                </div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="px-0 border-0">
              <div className="d-flex align-items-center">
                <FaChartLine className="text-info me-2" />
                <div>
                  <strong>Brent's Method:</strong>
                  <div className="text-muted small">
                    Algoritmo matemático de convergencia garantizada
                  </div>
                </div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="px-0 border-0">
              <div className="d-flex align-items-center">
                <FaDatabase className="text-warning me-2" />
                <div>
                  <strong>Análisis predictivo:</strong>
                  <div className="text-muted small">
                    Evalúa millones de combinaciones en segundos
                  </div>
                </div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="px-0 border-0">
              <div className="d-flex align-items-center">
                <FaRocket className="text-danger me-2" />
                <div>
                  <strong>Precisión financiera:</strong>
                  <div className="text-muted small">
                    Minimiza diferencias vs objetivo de inversión
                  </div>
                </div>
              </div>
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ClientInfoSidebar;
