import React, { useState } from 'react';
import { Card, Table, Badge, Spinner, Alert, Button, Collapse } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp, FaDownload } from 'react-icons/fa';
import ippService from '../../services/ippService';

/**
 * IPPFactorResults - Muestra los resultados del Factor de Redondeo por cliente
 * 
 * Props:
 * - jobId: string (ID del job de IPP)
 * - factorResults: object { cliente: { process_id, status, result_path, completed_at } }
 * - status: string (estado general del proceso)
 */
function IPPFactorResults({ jobId, factorResults, status }) {
  console.log('========== [IPPFactorResults] RENDER ==========');
  console.log('[IPPFactorResults] jobId:', jobId);
  console.log('[IPPFactorResults] status:', status);
  console.log('[IPPFactorResults] factorResults:', factorResults);
  console.log('[IPPFactorResults] factorResults es null?', factorResults === null);
  console.log('[IPPFactorResults] factorResults es undefined?', factorResults === undefined);
  console.log('[IPPFactorResults] Clientes en factorResults:', factorResults ? Object.keys(factorResults).length : 0);
  console.log('===============================================');
  
  const [expandedClients, setExpandedClients] = useState({});
  const [clientDetails, setClientDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  // Toggle expandir/colapsar cliente
  const toggleClient = async (cliente) => {
    const isExpanded = expandedClients[cliente];
    
    setExpandedClients(prev => ({
      ...prev,
      [cliente]: !isExpanded
    }));

    // Si se está expandiendo y no tenemos los detalles, cargarlos
    if (!isExpanded && !clientDetails[cliente] && factorResults[cliente]) {
      await loadClientDetails(cliente, factorResults[cliente].result_path);
    }
  };

  // Cargar detalles del resultado desde el backend
  const loadClientDetails = async (cliente, resultPath) => {
    setLoadingDetails(prev => ({ ...prev, [cliente]: true }));
    
    try {
      // Extraer bucket y key del path s3://bucket/key
      const s3Match = resultPath.match(/s3:\/\/([^/]+)\/(.+)/);
      if (!s3Match) {
        throw new Error('Invalid S3 path format');
      }

      const [, bucket, key] = s3Match;
      
      // Usar el servicio del backend para obtener una URL de descarga
      const downloadUrl = await ippService.getDownloadUrl(bucket, key);
      
      // Descargar el contenido del JSON
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      setClientDetails(prev => ({
        ...prev,
        [cliente]: result
      }));
    } catch (error) {
      console.error(`Error loading details for client ${cliente}:`, error);
      setClientDetails(prev => ({
        ...prev,
        [cliente]: { error: error.message }
      }));
    } finally {
      setLoadingDetails(prev => ({ ...prev, [cliente]: false }));
    }
  };

  // Descargar resultado completo de un cliente
  const downloadClientResult = async (cliente, resultPath) => {
    try {
      const s3Match = resultPath.match(/s3:\/\/([^/]+)\/(.+)/);
      if (!s3Match) {
        throw new Error('Invalid S3 path format');
      }

      const [, bucket, key] = s3Match;
      
      // Obtener URL de descarga del backend
      const downloadUrl = await ippService.getDownloadUrl(bucket, key);
      
      // Descargar el archivo usando la URL pre-firmada
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      // Crear y descargar archivo
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factor_redondeo_cliente_${cliente}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading result for client ${cliente}:`, error);
      alert(`Error descargando el resultado: ${error.message}`);
    }
  };

  // Si no hay resultados aún
  if (!factorResults || Object.keys(factorResults).length === 0) {
    console.log('[IPPFactorResults] No hay resultados. Status:', status);
    if (status === 'completed' || status === 'factor_initiated' || status === 'factor_processing' || status === 'factor_completed') {
      console.log('[IPPFactorResults] Mostrando spinner de espera...');
      
      // Determinar mensaje según el estado
      let mensaje = 'Esperando resultados del Factor de Redondeo...';
      if (status === 'completed') {
        mensaje = 'Iniciando Factor de Redondeo...';
      } else if (status === 'factor_completed') {
        mensaje = 'Finalizando proceso, obteniendo resultados...';
      }
      
      return (
        <Card className="shadow-sm mt-4">
          <Card.Header style={{ backgroundColor: '#648a26' }} className="text-white">
            <h5 className="mb-0">Resultados del Factor de Redondeo</h5>
          </Card.Header>
          <Card.Body>
            <Alert variant="info">
              <Spinner animation="border" size="sm" className="me-2" />
              {mensaje}
            </Alert>
          </Card.Body>
        </Card>
      );
    }
    console.log('[IPPFactorResults] No mostrar componente (status no aplica)');
    return null;
  }

  const totalClients = Object.keys(factorResults).length;
  const completedClients = Object.values(factorResults).filter(r => r.status === 'COMPLETED').length;

  return (
    <Card className="shadow-sm mt-4">
      <Card.Header style={{ backgroundColor: '#648a26' }} className="text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Resultados del Factor de Redondeo</h5>
          <Badge bg="light" text="dark">
            {completedClients}/{totalClients} Clientes Completados
          </Badge>
        </div>
      </Card.Header>
      <Card.Body>
        <Table hover responsive>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Process ID</th>
              <th>Estado</th>
              <th>Completado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(factorResults).map(([cliente, result]) => (
              <React.Fragment key={cliente}>
                <tr>
                  <td className="fw-bold">{cliente}</td>
                  <td>
                    <code className="small">{result.process_id}</code>
                  </td>
                  <td>
                    {result.status === 'COMPLETED' ? (
                      <Badge bg="success">
                        <FaCheckCircle className="me-1" />
                        Completado
                      </Badge>
                    ) : result.status === 'FAILED' ? (
                      <Badge bg="danger">
                        <FaTimesCircle className="me-1" />
                        Error
                      </Badge>
                    ) : (
                      <Badge bg="warning">
                        <Spinner animation="border" size="sm" className="me-1" />
                        Procesando
                      </Badge>
                    )}
                  </td>
                  <td className="small text-muted">
                    {result.completed_at ? new Date(result.completed_at).toLocaleString('es-MX') : '-'}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => toggleClient(cliente)}
                        disabled={result.status !== 'COMPLETED'}
                      >
                        {expandedClients[cliente] ? <FaChevronUp /> : <FaChevronDown />}
                        {expandedClients[cliente] ? ' Ocultar' : ' Ver Detalles'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => downloadClientResult(cliente, result.result_path)}
                        disabled={result.status !== 'COMPLETED'}
                      >
                        <FaDownload /> Descargar
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedClients[cliente] && (
                  <tr>
                    <td colSpan="5" style={{ backgroundColor: '#f8f9fa' }}>
                      <Collapse in={expandedClients[cliente]}>
                        <div className="p-3">
                          {loadingDetails[cliente] ? (
                            <div className="text-center py-4">
                              <Spinner animation="border" />
                              <p className="mt-2 text-muted">Cargando detalles...</p>
                            </div>
                          ) : clientDetails[cliente] ? (
                            clientDetails[cliente].error ? (
                              <Alert variant="danger">
                                Error: {clientDetails[cliente].error}
                              </Alert>
                            ) : (
                              <ClientDetailsView details={clientDetails[cliente]} />
                            )
                          ) : null}
                        </div>
                      </Collapse>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

/**
 * ClientDetailsView - Vista detallada del resultado de un cliente
 */
function ClientDetailsView({ details }) {
  if (!details || !details.resultado) {
    return (
      <Alert variant="warning">
        No hay detalles disponibles
      </Alert>
    );
  }

  const { resultado, metricas } = details;

  return (
    <div>
      <h6 className="mb-3">Métricas del Factor de Redondeo:</h6>
      
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="border rounded p-3 bg-white">
            <div className="small text-muted">Total Productos</div>
            <div className="h4 mb-0">{metricas?.totalProductos || '-'}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="border rounded p-3 bg-white">
            <div className="small text-muted">Productos Calculados</div>
            <div className="h4 mb-0 text-success">{metricas?.productosCalculados || '-'}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="border rounded p-3 bg-white">
            <div className="small text-muted">Monto Total</div>
            <div className="h4 mb-0 text-primary">
              ${(metricas?.montoTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="border rounded p-3 bg-white">
            <div className="small text-muted">Factor Óptimo</div>
            <div className="h4 mb-0 text-info">{metricas?.factorOptimo || '-'}</div>
          </div>
        </div>
      </div>

      {resultado.clientesData && resultado.clientesData.length > 0 && (
        <>
          <h6 className="mb-3">Primeros 10 Productos Calculados:</h6>
          <div className="table-responsive">
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                  <th>Inventario Calculado</th>
                  <th>Inversión</th>
                </tr>
              </thead>
              <tbody>
                {resultado.clientesData.slice(0, 10).map((producto, idx) => (
                  <tr key={idx}>
                    <td><code>{producto.Material}</code></td>
                    <td className="small">{producto.Descripcion?.substring(0, 40) || '-'}</td>
                    <td>${(producto.Precio || 0).toFixed(2)}</td>
                    <td>{(producto.InventarioCalculado || 0).toFixed(2)}</td>
                    <td>${(producto.InversionCalculada || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <p className="small text-muted text-center">
            Mostrando 10 de {resultado.clientesData.length} productos. Descarga el JSON para ver todos.
          </p>
        </>
      )}
    </div>
  );
}

export default IPPFactorResults;

