import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Form, 
  InputGroup, 
  Button, 
  Badge, 
  Row, 
  Col,
  Card,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import { 
  FaSearch, 
  FaChartLine, 
  FaDownload,
  FaFilter,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner
} from 'react-icons/fa';
import lambdaService from '../services/lambdaService';
import ConvergenceModal from './ConvergenceModal';

const AdvancedClientTable = ({ result, processId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal state
  const [showConvergenceModal, setShowConvergenceModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loadingClientData, setLoadingClientData] = useState(false);
  
  // Download loading state
  const [downloadingClients, setDownloadingClients] = useState(new Set());
  
  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Funciones para manejar toasts
  const addToast = (message, variant = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, variant }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Función para agrupar datos por cliente
  const groupDataByClient = (data) => {
    if (!data || !data.datos) return [];

    // Si hay resumenPorCliente (multi-cliente), usarlo
    if (data.resumenPorCliente && data.resumenPorCliente.length > 0) {
      return data.resumenPorCliente.map(cliente => ({
        clienteId: cliente.cliente,
        cliente: cliente.cliente,
        registros: cliente.registrosExportados || 0,
        factorOptimo: cliente.factorOptimo || 0,
        inversionDeseada: cliente.inversionDeseada || 0,
        resultado: cliente.sumaTotal || 0,
        diferencia: (cliente.sumaTotal || 0) - (cliente.inversionDeseada || 0),
        diasEquiv: cliente.diasEquivalentes || 0,
        tiempo: cliente.tiempoCalculoMs || 0,
        estado: cliente.status || 'SUCCESS',
        error: cliente.error || null
      }));
    }

    // Si es cliente único, extraer del resultado principal
    const clientesMap = {};
    data.datos.forEach(item => {
      const clienteId = item.Cliente || item.cliente;
      if (!clientesMap[clienteId]) {
        clientesMap[clienteId] = {
          clienteId: clienteId,
          cliente: clienteId,
          registros: 0,
          factorOptimo: data.factorRedondeoEncontrado || 0,
          inversionDeseada: data.resumenFinal?.inversionDeseada || 0,
          resultado: data.resumenFinal?.sumaTotal || 0,
          diferencia: (data.resumenFinal?.sumaTotal || 0) - (data.resumenFinal?.inversionDeseada || 0),
          diasEquiv: data.resumenFinal?.diasInversionDeseados || 0,
          tiempo: data.resumenFinal?.tiempoEjecucionMs || 0,
          estado: 'SUCCESS',
          error: null
        };
      }
      clientesMap[clienteId].registros++;
    });

    return Object.values(clientesMap);
  };

  // Procesar datos de clientes
  const clientesData = useMemo(() => {
    return groupDataByClient(result);
  }, [result]);

  // Filtrar datos según búsqueda y filtros
  const filteredClientes = useMemo(() => {
    let filtered = clientesData;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(cliente => 
        cliente.cliente.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cliente => {
        if (statusFilter === 'success') return cliente.estado === 'SUCCESS';
        if (statusFilter === 'error') return cliente.estado !== 'SUCCESS';
        return true;
      });
    }

    return filtered;
  }, [clientesData, searchTerm, statusFilter]);

  // Formatear números
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('es-MX').format(num);
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Formatear tiempo
  const formatTime = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Manejar descarga de Excel por cliente
  const handleDownloadClient = async (cliente) => {
    const clienteId = cliente.clienteId;
    
    try {
      // Marcar cliente como descargando
      console.log('🟡 Marcando cliente como descargando:', clienteId);
      setDownloadingClients(prev => {
        const newSet = new Set(prev).add(clienteId);
        console.log('🟡 Estado downloadingClients actualizado:', newSet);
        return newSet;
      });
      
      // Mostrar toast de inicio
      console.log('🟡 Mostrando toast de inicio');
      addToast(`Generando Excel para cliente ${cliente.cliente}...`, 'info');
      
      console.log('🔄 Descargando Excel para cliente:', cliente.cliente);
      
      // Llamar al servicio para descargar Excel del cliente específico
      const base64Data = await lambdaService.downloadClientExcel(processId, cliente.clienteId);
      
      // Método más directo: usar data URL directamente
      const fileName = `Cliente_${cliente.clienteId}_${processId}.xlsx`;
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Data}`;
      
      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.target = '_blank'; // Añadir target blank por si ayuda
      
      // Forzar la descarga de manera más agresiva
      document.body.appendChild(link);
      
      // Intentar múltiples métodos de descarga
      try {
        link.click();
      } catch (e) {
        console.warn('Método click() falló, intentando dispatchEvent');
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        link.dispatchEvent(event);
      }
      
      // Limpiar después
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 1000);
      
      console.log('✅ Intento de descarga ejecutado para cliente:', cliente.cliente);
      
      // Mostrar toast de éxito
      addToast(`✅ Excel generado para cliente ${cliente.cliente}`, 'success');
      
      // Fallback: si no se descarga automáticamente, mostrar enlace manual
      setTimeout(() => {
        console.log('🔄 Si la descarga no se inició automáticamente, puedes usar este enlace:');
        console.log(`📎 Descarga manual: ${dataUrl.substring(0, 100)}...`);
        
        // También intentar abrir en nueva pestaña como último recurso
        if (confirm(`¿No se descargó automáticamente? ¿Quieres abrir el archivo en una nueva pestaña?`)) {
          window.open(dataUrl, '_blank');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error descargando Excel del cliente:', error);
      
      // Mostrar toast de error
      addToast(`❌ Error al generar Excel para cliente ${cliente.cliente}`, 'danger');
      
      alert(`Error al descargar Excel del cliente ${cliente.cliente}: ${error.message}`);
    } finally {
      // Quitar cliente del estado de descarga
      setDownloadingClients(prev => {
        const newSet = new Set(prev);
        newSet.delete(clienteId);
        return newSet;
      });
    }
  };

  // Manejar vista de detalles de convergencia
  const handleViewDetails = (cliente) => {
    console.log('Mostrando gráfica de convergencia para cliente:', cliente.cliente);
    console.log('Datos del resultado completo:', result);
    
    // Usar los datos de convergencia del resultado principal
    setSelectedClient({
      ...cliente,
      optimizacion: result?.optimizacion || null,
      inversionOriginal: result?.inversionOriginal || 0,
      factorRedondeoEncontrado: result?.factorRedondeoEncontrado || 0,
      tiempoEjecucionMs: result?.resumenFinal?.tiempoEjecucionMs || 0,
      registrosTotales: result?.registrosTotales || 0
    });
    
    setShowConvergenceModal(true);
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = clientesData.length;
    const exitosos = clientesData.filter(c => c.estado === 'SUCCESS').length;
    const fallidos = total - exitosos;
    const totalRegistros = clientesData.reduce((sum, c) => sum + c.registros, 0);
    
    return { total, exitosos, fallidos, totalRegistros };
  }, [clientesData]);

  if (!result || clientesData.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <Card.Header className="bg-primary text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaUsers className="me-2" />
            Detalles por Cliente
          </h5>
          <div className="d-flex gap-2">
            <Badge bg="light" text="dark">{stats.total} clientes</Badge>
            <Badge bg="success">{stats.exitosos} exitosos</Badge>
            {stats.fallidos > 0 && <Badge bg="danger">{stats.fallidos} fallidos</Badge>}
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Controles de búsqueda y filtros */}
        <Row className="mb-3">
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text>
                <FaFilter />
              </InputGroup.Text>
              <Form.Select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="success">Solo exitosos</option>
                <option value="error">Solo fallidos</option>
              </Form.Select>
            </InputGroup>
          </Col>
          <Col md={2}>
            <div className="text-muted small">
              {filteredClientes.length} de {clientesData.length} clientes
            </div>
          </Col>
        </Row>

        {/* Tabla de resultados */}
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Cliente</th>
                <th className="text-center">Registros</th>
                <th className="text-center">Factor Óptimo</th>
                <th className="text-end">Inversión Deseada</th>
                <th className="text-end">Resultado</th>
                <th className="text-end">Diferencia</th>
                <th className="text-center">Días Equiv.</th>
                <th className="text-center">Tiempo</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente, index) => (
                <tr key={cliente.clienteId || index}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="text-success me-2">●</div>
                      <strong>{cliente.cliente}</strong>
                    </div>
                  </td>
                  <td className="text-center">
                    {formatNumber(cliente.registros)}
                  </td>
                  <td className="text-center">
                    <Badge bg="primary" className="px-2 py-1">
                      {cliente.factorOptimo}
                    </Badge>
                  </td>
                  <td className="text-end">
                    {formatCurrency(cliente.inversionDeseada)}
                  </td>
                  <td className="text-end">
                    {formatCurrency(cliente.resultado)}
                  </td>
                  <td className="text-end">
                    <span className={cliente.diferencia >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCurrency(cliente.diferencia)}
                    </span>
                  </td>
                  <td className="text-center">
                    {cliente.diasEquiv}
                  </td>
                  <td className="text-center">
                    {formatTime(cliente.tiempo)}
                  </td>
                  <td className="text-center">
                    <Badge 
                      bg={cliente.estado === 'SUCCESS' ? 'success' : 'danger'}
                      className="d-flex align-items-center gap-1"
                    >
                      {cliente.estado === 'SUCCESS' ? (
                        <>
                          <FaCheckCircle size={12} />
                          Exitoso
                        </>
                      ) : (
                        <>
                          <FaTimesCircle size={12} />
                          Fallido
                        </>
                      )}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <div className="d-flex gap-1 justify-content-center">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleViewDetails(cliente)}
                        disabled={false}
                        title="Ver gráfica de convergencia"
                      >
                        <FaChartLine />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => {
                          console.log('🟢 Click en botón descarga, cliente:', cliente.clienteId);
                          console.log('🟢 Estado actual downloadingClients:', downloadingClients);
                          handleDownloadClient(cliente);
                        }}
                        title="Descargar Excel"
                        disabled={downloadingClients.has(cliente.clienteId)}
                      >
                        {(() => {
                          const isDownloading = downloadingClients.has(cliente.clienteId);
                          console.log(`🟢 Renderizando botón cliente ${cliente.clienteId}, isDownloading:`, isDownloading);
                          return isDownloading ? (
                            <FaSpinner className="fa-spin" />
                          ) : (
                            <FaDownload />
                          );
                        })()}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {filteredClientes.length === 0 && (
          <div className="text-center text-muted py-4">
            <FaUsers size={48} className="mb-3 opacity-50" />
            <p>No se encontraron clientes que coincidan con los filtros.</p>
          </div>
        )}
      </Card.Body>
    </Card>
    
    {/* Modal de Convergencia */}
    <ConvergenceModal 
      show={showConvergenceModal}
      onHide={() => setShowConvergenceModal(false)}
      clientData={selectedClient}
      config={result?.config}
    />
    
    {/* Toast Notifications */}
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          show={true}
          onClose={() => removeToast(toast.id)}
          bg={toast.variant}
          autohide
          delay={4000}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toast.variant === 'success' ? '✅ Éxito' : 
               toast.variant === 'danger' ? '❌ Error' : 
               '📥 Descarga'}
            </strong>
          </Toast.Header>
          <Toast.Body className={toast.variant === 'success' || toast.variant === 'danger' ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  </div>
  );
};

export default AdvancedClientTable;
