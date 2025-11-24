import React, { useState } from 'react';
import { Card, Button, Table, Nav, Tab, Row, Col } from 'react-bootstrap';
import { FaDownload, FaChartLine, FaTable, FaUsers, FaUser } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import { formatNumber, formatTime, formatDate } from '../utils/formatters';
import AdvancedClientTable from './AdvancedClientTable';
import lambdaService from '../services/lambdaService';

/**
 * Componente para mostrar los resultados del procesamiento
 */
const ResultsDisplay = ({ result }) => {
  const [activeTab, setActiveTab] = useState('summary');

  // Manejar descarga de Excel por cliente
  const handleDownloadClient = async (cliente) => {
    try {
      console.log('Descargando Excel para cliente:', cliente.cliente);
      await lambdaService.downloadClientExcel(result.processId, cliente.clienteId);
    } catch (error) {
      console.error('Error descargando Excel del cliente:', error);
      alert(`Error al descargar Excel del cliente ${cliente.cliente}: ${error.message}`);
    }
  };

  // Manejar vista de detalles de cliente
  const handleViewDetails = async (cliente) => {
    try {
      console.log('Viendo detalles del cliente:', cliente.cliente);
      const details = await lambdaService.getClientDetails(result.processId, cliente.clienteId);
      
      // Por ahora solo mostrar en consola, después podríamos abrir un modal
      console.log('Detalles del cliente:', details);
      alert(`Detalles del cliente ${cliente.cliente}:\n` +
            `- Registros: ${details.totalRegistros}\n` +
            `- Productos únicos: ${details.materialesUnicos}\n` +
            `- Inversión total: $${details.totalInversion.toLocaleString()}`);
    } catch (error) {
      console.error('Error obteniendo detalles del cliente:', error);
      alert(`Error al obtener detalles del cliente ${cliente.cliente}: ${error.message}`);
    }
  };

  if (!result) return null;

  // Detectar si es resultado multi-cliente
  const isMultiClient = result.tipoProcesso === 'MULTI_CLIENT_AGGREGATED';
  const hasConvergenceData = result.convergenciaData && result.convergenciaData.length > 0;

  // Función para descargar JSON
  const downloadJSON = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `resultado_${result.processId || 'proceso'}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Configuración del gráfico de convergencia
  const chartData = hasConvergenceData ? {
    labels: result.convergenciaData.map((_, idx) => `Iteración ${idx + 1}`),
    datasets: [
      {
        label: 'Factor de Redondeo',
        data: result.convergenciaData.map(iter => iter.factor),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.1
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Convergencia del Algoritmo de Optimización'
      }
    },
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          {isMultiClient ? <FaUsers className="me-2" /> : <FaUser className="me-2" />}
          <h5 className="mb-0">
            Resultados del Procesamiento
            {isMultiClient && ` (${result.estadisticasConsolidadas?.totalClientes || 0} clientes)`}
          </h5>
        </div>
        <Button variant="light" size="sm" onClick={downloadJSON}>
          <FaDownload className="me-1" />
          Descargar JSON
        </Button>
      </Card.Header>

      <Card.Body>
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="summary">
                <FaTable className="me-1" />
                Resumen
              </Nav.Link>
            </Nav.Item>
            {hasConvergenceData && (
              <Nav.Item>
                <Nav.Link eventKey="convergence">
                  <FaChartLine className="me-1" />
                  Convergencia
                </Nav.Link>
              </Nav.Item>
            )}
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
              {isMultiClient ? (
                <MultiClientSummary result={result} />
              ) : (
                <SingleClientSummary result={result} />
              )}
            </Tab.Pane>

            {/* Tab de Convergencia */}
            {hasConvergenceData && (
              <Tab.Pane eventKey="convergence">
                <div className="mb-3">
                  <h6>Gráfico de Convergencia</h6>
                  <Line data={chartData} options={chartOptions} />
                </div>
                
                <h6 className="mt-4">Detalle de Iteraciones</h6>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Factor</th>
                      <th>Inversión</th>
                      <th>Diferencia</th>
                      <th>Mejor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.convergenciaData.slice(0, 10).map((iter, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{iter.factor?.toFixed(4)}</td>
                        <td>{formatNumber(iter.inversion)}</td>
                        <td>{iter.diferencia?.toFixed(2)}</td>
                        <td>{iter.esMejor ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {result.convergenciaData.length > 10 && (
                  <small className="text-muted">
                    Mostrando las primeras 10 iteraciones de {result.convergenciaData.length} total
                  </small>
                )}
              </Tab.Pane>
            )}

            {/* Tab por Cliente */}
            <Tab.Pane eventKey="clients">
              <AdvancedClientTable 
                result={result}
                onDownloadClient={handleDownloadClient}
                onViewDetails={handleViewDetails}
              />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Card.Body>
    </Card>
  );
};

// Componente para resumen de cliente único
const SingleClientSummary = ({ result }) => (
  <Row>
    <Col md={6}>
      <h6>Estadísticas del Procesamiento</h6>
      <Table striped bordered hover size="sm">
        <tbody>
          <tr>
            <td><strong>Registros Originales</strong></td>
            <td>{formatNumber(result.totalFilasOriginales || 0)}</td>
          </tr>
          <tr>
            <td><strong>Registros Exportados</strong></td>
            <td>{formatNumber(result.totalFilasExportadas || 0)}</td>
          </tr>
          <tr>
            <td><strong>Factor Óptimo</strong></td>
            <td>{result.configUsada?.factorRedondeo || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Tiempo de Cálculo</strong></td>
            <td>{formatTime(result.tiempoCalculoMs || 0)}</td>
          </tr>
          <tr>
            <td><strong>Calculado</strong></td>
            <td>{formatDate(result.calculado)}</td>
          </tr>
        </tbody>
      </Table>
    </Col>
    <Col md={6}>
      {result.resumenFinal && (
        <>
          <h6>Resumen Final</h6>
          <Table striped bordered hover size="sm">
            <tbody>
              <tr>
                <td><strong>Registros Procesados</strong></td>
                <td>{formatNumber(result.resumenFinal.registros || 0)}</td>
              </tr>
              <tr>
                <td><strong>Registros > 0</strong></td>
                <td>{formatNumber(result.resumenFinal.registrosMayorCero || 0)}</td>
              </tr>
              <tr>
                <td><strong>Factor Óptimo</strong></td>
                <td>{result.resumenFinal.factorOptimo || 'N/A'}</td>
              </tr>
            </tbody>
          </Table>
        </>
      )}
    </Col>
  </Row>
);

// Componente para resumen multi-cliente
const MultiClientSummary = ({ result }) => (
  <Row>
    <Col md={6}>
      <h6>Estadísticas Consolidadas</h6>
      <Table striped bordered hover size="sm">
        <tbody>
          <tr>
            <td><strong>Total Clientes</strong></td>
            <td>{result.estadisticasConsolidadas?.totalClientes || 0}</td>
          </tr>
          <tr>
            <td><strong>Clientes Exitosos</strong></td>
            <td>{result.estadisticasConsolidadas?.clientesExitosos || 0}</td>
          </tr>
          <tr>
            <td><strong>Clientes con Error</strong></td>
            <td>{result.estadisticasConsolidadas?.clientesConError || 0}</td>
          </tr>
          <tr>
            <td><strong>Porcentaje de Éxito</strong></td>
            <td>{result.estadisticasConsolidadas?.porcentajeExito || 0}%</td>
          </tr>
          <tr>
            <td><strong>Registros Totales</strong></td>
            <td>{formatNumber(result.estadisticasConsolidadas?.totalRegistrosOriginales || 0)}</td>
          </tr>
        </tbody>
      </Table>
    </Col>
    <Col md={6}>
      <h6>Métricas Generales</h6>
      <Table striped bordered hover size="sm">
        <tbody>
          <tr>
            <td><strong>Registros Exportados</strong></td>
            <td>{formatNumber(result.estadisticasConsolidadas?.totalRegistrosExportados || 0)}</td>
          </tr>
          <tr>
            <td><strong>Factor Promedio</strong></td>
            <td>{result.estadisticasConsolidadas?.factorPromedioGeneral || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Tiempo Total</strong></td>
            <td>{formatTime(result.estadisticasConsolidadas?.tiempoProcesamientoTotal || 0)}</td>
          </tr>
          <tr>
            <td><strong>Procesado</strong></td>
            <td>{formatDate(result.timestamp)}</td>
          </tr>
        </tbody>
      </Table>
    </Col>
  </Row>
);

// Componente para desglose por cliente
const ClientBreakdown = ({ result }) => (
  <div>
    <h6>Resultados por Cliente</h6>
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Estado</th>
          <th>Registros</th>
          <th>Factor</th>
          <th>Tiempo</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        {result.resumenPorCliente?.map((cliente, idx) => (
          <tr key={idx}>
            <td><strong>{cliente.cliente}</strong></td>
            <td>
              <span className={`badge ${cliente.status === 'SUCCESS' ? 'bg-success' : 'bg-danger'}`}>
                {cliente.status}
              </span>
            </td>
            <td>{formatNumber(cliente.registrosExportados || 0)}</td>
            <td>{cliente.factorOptimo || 'N/A'}</td>
            <td>{formatTime(cliente.tiempoCalculoMs || 0)}</td>
            <td>
              {cliente.error ? (
                <small className="text-danger">{cliente.error}</small>
              ) : (
                '✅'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
);

export default ResultsDisplay;
