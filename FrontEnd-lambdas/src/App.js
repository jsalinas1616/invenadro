import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  ProgressBar,
  Navbar,
  Table,
  Badge,
  InputGroup,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import { 
  FaCloudUploadAlt, 
  FaCog, 
  FaDownload, 
  FaChartLine, 
  FaArrowUp,
  FaSpinner,
  FaUsers,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaSignOutAlt,
  FaUser,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import lambdaService from './services/lambdaService';
import ConvergenceModal from './components/ConvergenceModal';
import CustomAuthenticator from './components/CustomAuthenticator';
import Sidebar from './components/Sidebar';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Componente de tabla avanzada por cliente
const AdvancedClientTable = ({ result, processId, onViewDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
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

  // Manejar descarga de Excel por cliente
  const handleDownloadClient = async (cliente) => {
    const clienteId = cliente.clienteId;
    
    try {
      // Marcar cliente como descargando
      console.log('Marcando cliente como descargando:', clienteId);
      setDownloadingClients(prev => {
        const newSet = new Set(prev).add(clienteId);
        console.log('Estado downloadingClients actualizado:', newSet);
        return newSet;
      });
      
      // Mostrar toast de inicio
      console.log('Mostrando toast de inicio');
      addToast(`Generando Excel para cliente ${cliente.cliente}...`, 'success');
      
      console.log('Descargando Excel para cliente:', cliente.cliente);
      
      // Llamar al servicio para descargar Excel del cliente específico
      const base64Data = await lambdaService.downloadClientExcel(processId, cliente.clienteId);
      
      // VALIDAR que recibimos Base64 válido
      if (!base64Data || base64Data.length === 0) {
        throw new Error('No se recibió contenido del servidor');
      }
      
      console.log(`Base64 recibido, tamaño: ${base64Data.length} chars`);
      
      // VALIDAR formato Base64 (debe ser solo caracteres válidos)
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        console.error('ERROR: Contenido recibido NO es Base64 válido:', base64Data.substring(0, 100));
        throw new Error('El servidor no devolvió un archivo válido');
      }
      
      // Convertir Base64 a ArrayBuffer (método robusto para archivos grandes)
      let binaryString, bytes;
      try {
        binaryString = atob(base64Data);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } catch (decodeError) {
        console.error('ERROR: Error decodificando Base64:', decodeError);
        throw new Error('Error al procesar el archivo descargado');
      }
      
      console.log(`ArrayBuffer creado, tamaño: ${bytes.length} bytes`);
      
      // Crear Blob desde ArrayBuffer
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      console.log(`Blob creado, tamaño: ${blob.size} bytes`);
      
      // Crear Object URL desde Blob (más eficiente que data URL)
      const url = window.URL.createObjectURL(blob);
      const fileName = `Cliente_${cliente.clienteId}_${processId}.xlsx`;
      
      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Forzar la descarga
      document.body.appendChild(link);
      link.click();
      
      // Limpiar después
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url); // Liberar memoria
      }, 100);
      
      console.log('Intento de descarga ejecutado para cliente:', cliente.cliente);
      
      // Mostrar toast de éxito
      addToast(`Excel generado para cliente ${cliente.cliente}`, 'success');
      
    } catch (error) {
      console.error('ERROR: Error descargando Excel del cliente:', error);
      
      // Mostrar toast de error
      addToast(`Error al generar Excel para cliente ${cliente.cliente}`, 'danger');
      
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

  // Función para agrupar datos por cliente
  const groupDataByClient = (data) => {
    if (!data) return [];

    // 🔍 DETECTAR SI ES MULTI-CLIENTE
    const isMultiClient = data.tipoProcesso === 'MULTI_CLIENT_AGGREGATED' || 
                         data.resumenPorCliente || 
                         data.estadisticasConsolidadas;

    console.log('🔍 Detectando tipo de resultado:', { isMultiClient, data });

    // ✅ SI ES MULTI-CLIENTE: usar resumenPorCliente
    if (isMultiClient && data.resumenPorCliente && data.resumenPorCliente.length > 0) {
      console.log('✅ Procesando resultado MULTI-CLIENTE');
      return data.resumenPorCliente.map(cliente => ({
        clienteId: cliente.cliente,
        cliente: cliente.cliente,
        registros: cliente.registrosOriginales || cliente.registrosExportados || 0,
        registrosMayorCero: cliente.registrosMayorCero || 0,
        factorOptimo: cliente.factorOptimo || 'N/A',
        montoVentaMostrador: cliente.inversionOriginal || 0,  // ✅ NUEVO: Monto Venta Mostrador
        inversionDeseada: cliente.inversionDeseada || 0,
        resultado: cliente.sumaTotal || 0,
        diferencia: cliente.diferencia || 0,
        diasEquiv: cliente.diasEquivalentes || 0,
        tiempo: cliente.tiempoCalculoMs || 0,
        estado: cliente.status || 'SUCCESS',
        error: cliente.error || null
      }));
    }

    // ✅ SI ES SINGLE-CLIENT: extraer del resultado principal
    if (!data.datos || data.datos.length === 0) {
      console.warn('⚠️ No hay datos disponibles');
      return [];
    }

    console.log('✅ Procesando resultado SINGLE-CLIENT');
    const clientesMap = {};
    data.datos.forEach(item => {
      const clienteId = item.Cliente || item.cliente;
      if (!clientesMap[clienteId]) {
        clientesMap[clienteId] = {
          clienteId: clienteId,
          cliente: clienteId,
          registros: 0,
          registrosMayorCero: data.resumenFinal?.registrosMayorCero || 0,
          factorOptimo: data.factorRedondeoEncontrado || 0,
          montoVentaMostrador: data.resumenFinal?.inversionOriginal || data.inversionOriginal || 0, 
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
  const clientesData = React.useMemo(() => {
    return groupDataByClient(result);
  }, [result]);

  // Filtrar datos según búsqueda y filtros
  const filteredClientes = React.useMemo(() => {
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


  // Usar la función del componente padre
  const handleViewDetails = onViewDetails;

  // Calcular estadísticas
  const stats = React.useMemo(() => {
    const total = clientesData.length;
    const exitosos = clientesData.filter(c => c.estado === 'SUCCESS').length;
    const fallidos = total - exitosos;
    const totalRegistros = clientesData.reduce((sum, c) => sum + c.registros, 0);
    
    return { total, exitosos, fallidos, totalRegistros };
  }, [clientesData]);

  if (!result || clientesData.length === 0) {
    return (
      <Alert variant="info">
        <FaUsers className="me-2" />
        No hay datos de clientes disponibles para mostrar.
      </Alert>
    );
  }

  return (
    <>
    <Card className="mt-4">
      <Card.Header style={{ backgroundColor: '#648a26' }} className="text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaUsers className="me-2" />
            Detalles por Cliente ({stats.total})
          </h5>
          <div className="d-flex gap-2">
            <Badge bg="light" text="dark">{stats.total} clientes</Badge>
            <Badge bg="success">{stats.exitosos} exitosos</Badge>
            {stats.fallidos > 0 && <Badge bg="danger">{stats.fallidos} fallidos</Badge>}
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Cuadros de estadísticas elegantes */}
        <Row className="g-4 mb-5">
          <Col xs={12} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ 
              borderLeft: '5px solid #648a26',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <Card.Body className="text-center d-flex flex-column justify-content-center py-4">
                <div className="mb-2">
                  <FaCheckCircle style={{ color: '#648a26', fontSize: '2rem', opacity: 0.8 }} />
                </div>
                <h1 className="fw-bold mb-2" style={{ 
                  fontSize: '3.5rem', 
                  color: '#648a26',
                  fontWeight: '700',
                  lineHeight: '1'
                }}>
                  {stats.exitosos}
                </h1>
                <div style={{ 
                  fontSize: '1.1rem', 
                  color: '#6c757d',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Exitosos
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ 
              borderLeft: '5px solid #648a26',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <Card.Body className="text-center d-flex flex-column justify-content-center py-4">
                <div className="mb-2">
                  <FaSpinner style={{ color: '#648a26', fontSize: '2rem', opacity: 0.8 }} />
                </div>
                <h1 className="fw-bold mb-2" style={{ 
                  fontSize: '3.5rem', 
                  color: '#648a26',
                  fontWeight: '700',
                  lineHeight: '1'
                }}>
                  {(() => {
                    const tiempoTotal = clientesData.reduce((sum, c) => sum + (c.tiempo || 0), 0);
                    const tiempoPromedio = clientesData.length > 0 ? tiempoTotal / clientesData.length : 0;
                    return `${(tiempoPromedio / 1000).toFixed(1)}s`;
                  })()}
                </h1>
                <div style={{ 
                  fontSize: '1.1rem', 
                  color: '#6c757d',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Tiempo Promedio/Cliente
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ 
              borderLeft: '5px solid #648a26',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <Card.Body className="text-center d-flex flex-column justify-content-center py-4">
                <div className="mb-2">
                  <FaCog style={{ color: '#648a26', fontSize: '2rem', opacity: 0.8 }} />
                </div>
                <h1 className="fw-bold mb-2" style={{ 
                  fontSize: '3.5rem', 
                  color: '#648a26',
                  fontWeight: '700',
                  lineHeight: '1'
                }}>
                  {(() => {
                    // Calcular tiempo total del proceso principal
                    if (result?.processStartTime && result?.processEndTime) {
                      const start = new Date(result.processStartTime);
                      const end = new Date(result.processEndTime);
                      const diff = end - start;
                      const minutes = Math.floor(diff / 60000);
                      const seconds = Math.floor((diff % 60000) / 1000);
                      return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                    }
                    return 'N/A';
                  })()}
                </h1>
                <div style={{ 
                  fontSize: '1.1rem', 
                  color: '#6c757d',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Tiempo Total del Proceso
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
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
                <th className="text-center">{'>'} 0</th>
                <th className="text-center">Factor Óptimo</th>
                <th className="text-end">Monto Venta Mostrador</th>
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
                    {formatNumber(cliente.registrosMayorCero)}
                  </td>
                  <td className="text-center">
                    <Badge bg="primary" className="px-2 py-1">
                      {cliente.factorOptimo}
                    </Badge>
                  </td>
                  <td className="text-end">
                    {formatCurrency(cliente.montoVentaMostrador)}
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
                        title="Ver gráfica de convergencia"
                      >
                        <FaChartLine />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => handleDownloadClient(cliente)}
                        title="Descargar Excel"
                        disabled={downloadingClients.has(cliente.clienteId)}
                        className="download-btn-custom"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '32px',
                          minHeight: '32px'
                        }}
                      >
                        {downloadingClients.has(cliente.clienteId) ? (
                          <FaSpinner className="fa-spin" />
                        ) : (
                          <FaDownload />
                        )}
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
    </>
  );
};

function App() {
  // Frontend Lambda - Conectado a AWS Lambda + Step Functions
  console.log('Frontend Lambda iniciado - AWS Serverless Architecture');

  // Estados del componente
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [config, setConfig] = useState({
    factorRedondeo: 0.5,
    joroba: 3.5,
    diasInversionDeseados: 27.5,
    diasDeInverionReporteSubido: 30,
    precioMaximo: 3000 
  });
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [progressDetails, setProgressDetails] = useState('');
  
  // Estados específicos para lambdas
  const [processId, setProcessId] = useState(null);
  const [status, setStatus] = useState('idle');

  // Estados para el modal de convergencia
  const [showConvergenceModal, setShowConvergenceModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Estado para mostrar/ocultar configuración
  const [showConfigPanel, setShowConfigPanel] = useState(true);

  // Estado para el módulo activo en el Sidebar
  const [activeModule, setActiveModule] = useState('farmatodo-spp'); // default: Farmatodo SPP
  
  // Estado para mostrar/ocultar Sidebar
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Función para cambiar de módulo
  const handleModuleChange = (module) => {
    console.log('Módulo seleccionado:', module);
    setActiveModule(module);
    // Resetear estados cuando se cambia de módulo
    setFile(null);
    setResult(null);
    setError(null);
    setProcessId(null);
    setStatus('idle');
  };

  // Función para toggle del sidebar
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // Debug: Log cuando cambia la configuración
  useEffect(() => {
    console.log('Estado config actualizado:', config);
  }, [config]);

  // Polling para verificar estado del proceso Lambda
  useEffect(() => {
    if (processId && status !== 'COMPLETED' && status !== 'FAILED') {
      const interval = setInterval(async () => {
        try {
          console.log(`[LAMBDA] Consultando estado para processId: ${processId}`);
          const statusData = await lambdaService.checkProcessStatus(processId);
          console.log(`[LAMBDA] Estado recibido:`, statusData);
          
          setStatus(statusData.status);
          
          // Actualizar progreso basado en estado
          const progressMap = {
            'RUNNING': 10,
            'PROCESSING': 40,
            'PROCESSING_MULTI': 50,
            'AGGREGATING': 80,
            'PROCESSED': 60,
            'CHECKING': 80,
            'CHECKED': 90,
            'DOWNLOADING': 95,
            'COMPLETED': 100
          };
          
          setOverallProgress(progressMap[statusData.status] || 0);
          
          // ✅ NUEVO: Mostrar mensaje detallado de progreso si está disponible
          if (statusData.message) {
            setProcessingStage(statusData.message);
          } else {
          setProcessingStage(lambdaService.getReadableStatus(statusData.status));
          }
          
          if (statusData.status === 'COMPLETED' || statusData.status === 'PROCESSED') {
            // Descargar resultado
            const resultData = await lambdaService.downloadResult(processId);
            setResult(resultData);
            setLoading(false);
            clearInterval(interval);
          } else if (statusData.status === 'FAILED') {
            setError('El procesamiento falló. Revisa los logs en AWS.');
            setLoading(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('[LAMBDA] Error consultando estado:', err);
          setError(`Error consultando estado: ${err.message}`);
          setLoading(false);
          clearInterval(interval);
        }
      }, 5000); // Consultar cada 5 segundos
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [processId, status]);

  // 📋 VALIDAR COLUMNAS DEL EXCEL
  const validarColumnasExcel = async (archivo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON para obtener headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headers = jsonData[0] || [];
          
          console.log('Headers encontrados:', headers);
          
          // Definir columnas obligatorias
          const columnasObligatorias = [
            { nombre: 'Cliente', variantes: ['Cliente'] },
            { nombre: 'Material', variantes: ['Material'] },
            { nombre: 'Descripción', variantes: ['Descripción', 'Descripcion', 'Desc Material', 'DescMaterial'] },
            { nombre: 'EAN/UPC', variantes: ['EAN/UPC', 'EANUPC', 'EAN', 'UPC'] },
            { nombre: 'Ctd.UMB', variantes: ['Ctd.UMB', 'CtdUMB', 'CantidadUMB'] },
            { nombre: 'Factor F', variantes: ['Factor F', 'FactorF'] },
            { nombre: 'Ponderación Tradicional', variantes: ['Ponderación Tradicional', 'PonderacionTradicional'] },
            { nombre: 'Factor 9', variantes: ['Factor 9', 'Factor9'] },
            { nombre: 'Factor D', variantes: ['Factor D', 'FactorD'] }
          ];
          
          // Validar columnas de precio
          const tienePrecio = headers.some(header => {
            const headerLower = header.toLowerCase().replace(/\s+/g, '');
            return headerLower.includes('preciofarmacia') || 
                   headerLower.includes('precio');
          });
          
          // Validar columnas de inversión
          const tieneInversion = headers.some(header => {
            const headerLower = header.toLowerCase().replace(/\s+/g, '');
            return headerLower.includes('montoventamostrador') || 
                   (headerLower.includes('monto') && headerLower.includes('venta')) ||
                   headerLower.includes('importe');
          });
          
          // Verificar columnas obligatorias
          const columnasFaltantes = [];
          
          columnasObligatorias.forEach(({ nombre, variantes }) => {
            const encontrada = variantes.some(variante => headers.includes(variante));
            if (!encontrada) {
              columnasFaltantes.push(`${nombre} (esperado: ${variantes.join(' o ')})`);
            }
          });
          
          if (!tienePrecio) {
            columnasFaltantes.push('Precio Farmacia (o variantes: precio, etc.)');
          }
          
          if (!tieneInversion) {
            columnasFaltantes.push('Monto Venta Mostrador (o variantes: Monto Venta, Importe)');
          }
          
          if (columnasFaltantes.length > 0) {
            resolve({
              esValido: false,
              columnasFaltantes,
              headersEncontrados: headers
            });
          } else {
            resolve({
              esValido: true,
              headersEncontrados: headers
            });
          }
          
    } catch (error) {
          console.error('Error validando Excel:', error);
          reject(new Error('Error al leer el archivo Excel'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsBinaryString(archivo);
    });
  };
  
  // Sistema simplificado: Solo procesamiento directo (sin polling)

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
        setError(null);
      }
    },
    onDropRejected: () => {
      setError('Por favor, selecciona solo archivos Excel (.xlsx o .xls)');
    }
  });

  const handleConfigChange = (field) => (event) => {
    const newValue = parseFloat(event.target.value) || 0;
    console.log(`Cambiando ${field} de ${config[field]} a ${newValue}`);
    setConfig(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  // Eliminado: Función de polling (ya no se usa modo async)
    
  const handleSubmit = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo Excel');
      return;
    }

    console.log('ESTADO ACTUAL AL ENVIAR:', config);
    console.log('Factor de redondeo actual:', config.factorRedondeo);

    setLoading(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);
    setOverallProgress(0);
    setProcessingStage('Validando archivo Excel...');
    setProgressDetails('');

    try {
      // VALIDAR COLUMNAS DEL EXCEL ANTES DE PROCESAR
      console.log('Validando columnas del Excel...');
      const validacionResultado = await validarColumnasExcel(file);
      
      if (!validacionResultado.esValido) {
        setLoading(false);
        setProcessingStage('');
        
        const mensajeError = `El archivo Excel no tiene las columnas requeridas:\n\n` +
                           `Columnas faltantes:\n${validacionResultado.columnasFaltantes.map(col => `• ${col}`).join('\n')}\n\n` +
                           `Columnas encontradas:\n${validacionResultado.headersEncontrados.map(col => `• ${col}`).join('\n')}\n\n` +
                           `Asegúrate de que tu Excel tenga todas las columnas obligatorias para el cálculo.`;
        
        setError(mensajeError);
        return;
      }
      
      console.log('Validación de columnas exitosa');
      setProcessingStage('Archivo válido, iniciando procesamiento con AWS Lambda...');
      setOverallProgress(5);
      
      // Enviar a Lambda a través del servicio
      console.log('[LAMBDA] Iniciando procesamiento con configuración:', config);
      const response = await lambdaService.initiateProcessing(file, config);
      
      console.log('[LAMBDA] Respuesta del initiate:', response);
      
      if (response.processId) {
        setProcessId(response.processId);
        setStatus('RUNNING');
        setOverallProgress(10);
        setProcessingStage('Proceso iniciado en AWS Step Functions...');
      } else {
        throw new Error('No se recibió processId del servidor');
      }
      
    } catch (err) {
      console.error('[LAMBDA] Error en handleSubmit:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
      setOverallProgress(0);
      setProcessingStage('');
    }
  };

  // ARQUITECTURA AWS LAMBDA: Frontend conectado a AWS Lambda + Step Functions



  // Función para descargar resultados consolidados en Excel
  const handleDownload = async () => {
    console.log('🔽 INICIANDO DESCARGA CONSOLIDADA...');
    console.log('📊 Result disponible:', !!result);
    
    if (!result) {
      console.error('❌ No hay result disponible');
      setError('No hay resultados disponibles para descargar');
      return;
    }

    try {
      console.log('📦 Datos de result:', {
        tipoProcesso: result.tipoProcesso,
        hasResumenPorCliente: !!result.resumenPorCliente,
        hasEstadisticas: !!result.estadisticasConsolidadas,
        hasDatos: !!result.datos,
        datosLength: result.datos?.length
      });
      
      // 🔍 DETECTAR SI ES MULTI-CLIENTE
      const isMultiClient = result.tipoProcesso === 'MULTI_CLIENT_AGGREGATED' || 
                           result.resumenPorCliente || 
                           result.estadisticasConsolidadas;
      
      console.log('🔍 Es multi-cliente?', isMultiClient);
      
      let clientesData = [];
      
      if (isMultiClient && result.resumenPorCliente && result.resumenPorCliente.length > 0) {
        // Para multi-cliente, usar resumenPorCliente directamente
        clientesData = result.resumenPorCliente.map(cliente => ({
          cliente: cliente.cliente,
          registros: cliente.registrosOriginales || cliente.registrosExportados || 0,
          registrosMayorCero: cliente.registrosMayorCero || 0,
          factorOptimo: cliente.factorOptimo || 'N/A',
          montoVentaMostrador: cliente.inversionOriginal || 0,  // ✅ AGREGAR montoVentaMostrador
          inversionDeseada: cliente.inversionDeseada || 0,
          resultado: cliente.sumaTotal || 0,
          diferencia: cliente.diferencia || 0,
          diasEquiv: cliente.diasEquivalentes || 0,
          tiempo: cliente.tiempoCalculoMs || 0,
          estado: cliente.status || 'SUCCESS'
        }));
      } else if (result.datos && result.datos.length > 0) {
        // Para single-client, agrupar por cliente
        const clientesMap = {};
        result.datos.forEach(item => {
          const clienteId = item.Cliente || item.cliente;
          if (!clientesMap[clienteId]) {
            clientesMap[clienteId] = {
              cliente: clienteId,
              registros: 0,
              registrosMayorCero: result.resumenFinal?.registrosMayorCero || 0,
              factorOptimo: result.factorRedondeoEncontrado || 0,
              montoVentaMostrador: result.resumenFinal?.inversionOriginal || result.inversionOriginal || 0,
              inversionDeseada: result.resumenFinal?.inversionDeseada || 0,
              resultado: result.resumenFinal?.sumaTotal || 0,
              diferencia: (result.resumenFinal?.sumaTotal || 0) - (result.resumenFinal?.inversionDeseada || 0),
              diasEquiv: result.resumenFinal?.diasInversionDeseados || 0,
              tiempo: result.resumenFinal?.tiempoEjecucionMs || 0,
              estado: 'SUCCESS'
            };
          }
          clientesMap[clienteId].registros++;
        });
        clientesData = Object.values(clientesMap);
      }
      
      console.log('✅ clientesData generado:', clientesData.length, 'clientes');
      console.log('📊 Primer cliente:', clientesData[0]);
      
      if (clientesData.length === 0) {
        console.error('❌ No hay clientesData');
        setError('No hay datos de clientes para exportar');
        return;
      }

      // Formatear datos para Excel
      console.log('📊 Formateando datos para Excel...');
      const excelData = clientesData.map(cliente => ({
        'Cliente': cliente.cliente,
        'Registros': cliente.registros,
        'Registros > 0': cliente.registrosMayorCero,
        'Factor Óptimo': cliente.factorOptimo !== 'N/A' ? cliente.factorOptimo : '',
        'Monto Venta Mostrador': cliente.montoVentaMostrador ? `$${cliente.montoVentaMostrador.toLocaleString('es-MX')}` : '$0',
        'Inversión Deseada': cliente.inversionDeseada ? `$${cliente.inversionDeseada.toLocaleString('es-MX')}` : '$0',
        'Resultado': cliente.resultado ? `$${cliente.resultado.toLocaleString('es-MX')}` : '$0',
        'Diferencia': cliente.diferencia ? `$${cliente.diferencia.toLocaleString('es-MX')}` : '$0',
        'Días Equiv.': cliente.diasEquiv,
        'Tiempo (s)': Math.round(cliente.tiempo / 1000),
        'Estado': cliente.estado
      }));

      console.log('📊 ExcelData generado:', excelData.length, 'filas');
      
      // Crear workbook y worksheet
      console.log('📊 Creando workbook con XLSX...');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      console.log('✅ Worksheet creado');
      
      // Ajustar anchos de columnas
      const colWidths = [
        { wch: 12 },  // Cliente
        { wch: 12 },  // Registros
        { wch: 15 },  // Registros > 0
        { wch: 15 },  // Factor Óptimo
        { wch: 22 },  // Monto Venta Mostrador
        { wch: 18 },  // Inversión Deseada
        { wch: 18 },  // Resultado
        { wch: 18 },  // Diferencia
        { wch: 12 },  // Días Equiv.
        { wch: 12 },  // Tiempo
        { wch: 12 }   // Estado
      ];
      ws['!cols'] = colWidths;

      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

      console.log('✅ Worksheet agregado al workbook');
      
      // Generar archivo Excel y descargar
      const fileName = `Resultados_Consolidados_${processId || 'proceso'}.xlsx`;
      console.log('💾 Iniciando descarga:', fileName);
      
      XLSX.writeFile(wb, fileName);
      
      console.log('✅✅✅ Excel consolidado descargado exitosamente');
      
    } catch (error) {
      console.error('❌❌❌ Error descargando Excel consolidado:', error);
      console.error('Stack:', error.stack);
      setError('Error al generar el archivo Excel. Por favor, intenta nuevamente.');
    }
  };

  // Manejar vista de detalles de cliente (modal de convergencia)
  const handleViewDetailsClient = (cliente) => {
    console.log('Mostrando gráfica de convergencia para cliente:', cliente.cliente);
    
    // Abrir modal con gráfica de convergencia
    setSelectedClient(cliente);
    setShowConvergenceModal(true);
  };

  return (
    <CustomAuthenticator>
      {({ signOut, user }) => (
        <div className="min-vh-100 app-background">
          {/* Header Moderno */}
          <Navbar className="navbar-modern shadow-lg">
            <Container fluid>
              {/* Botón Toggle Sidebar */}
              <Button 
                className="btn-toggle-sidebar me-3"
                onClick={toggleSidebar}
                title={sidebarVisible ? "Ocultar menú" : "Mostrar menú"}
              >
                {sidebarVisible ? <FaTimes /> : <FaBars />}
              </Button>
              
              {/* Logo y Título */}
              <Navbar.Brand className="navbar-brand-modern">
                <div className="d-flex align-items-center gap-3">
                  <div className="logo-container">
                    <img 
                      src="/logo-invenadro.png" 
                      alt="Invenadro Logo" 
                      height="45"
                      className="logo-img"
                    />
                  </div>
                  <div className="brand-text">
                    <h4 className="mb-0 fw-bold text-white">Invenadro</h4>
                    <small className="text-white-50">Sistema de Optimización</small>
                  </div>
                </div>
              </Navbar.Brand>
              
              {/* Separador */}
              <div className="navbar-separator"></div>
              
              {/* Usuario y Logout */}
              <div className="d-flex align-items-center gap-4">
                {/* Badge de versión */}
                <span className="badge-modern">
                  <span className="badge-icon">⚡</span>
                  v2.0
                </span>
                
                {/* Info del usuario */}
                <div className="user-info">
                  <div className="user-avatar">
                    <FaUser />
                  </div>
                  <div className="user-details">
                    <div className="user-name">
                      {user?.signInDetails?.loginId || user?.username || 'Usuario'}
                    </div>
                    <div className="user-role">Administrador</div>
                  </div>
                </div>
                
                {/* Botón Logout moderno */}
                <Button 
                  className="btn-logout-modern"
                  onClick={signOut}
                >
                  <FaSignOutAlt className="me-2" />
                  Salir
                </Button>
              </div>
            </Container>
          </Navbar>

          {/* Layout con Sidebar y Main Content */}
          <div className="d-flex">
            {/* Sidebar */}
            <Sidebar 
              activeModule={activeModule} 
              onModuleChange={handleModuleChange}
              visible={sidebarVisible}
            />
            
            {/* Main Content */}
            <div 
              className="main-content" 
              style={{ 
                marginLeft: sidebarVisible ? '280px' : '0', 
                width: sidebarVisible ? 'calc(100% - 280px)' : '100%', 
                minHeight: 'calc(100vh - 76px)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Contenido según módulo seleccionado */}
              {activeModule === 'farmatodo-spp' && (
                <>
      <Container fluid className="py-4">
        {/* Botón para mostrar/ocultar panel de configuración */}
        <Row className="mb-3">
          <Col>
            <Button
              variant={showConfigPanel ? "outline-secondary" : "outline-primary"}
              size="sm"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="d-flex align-items-center"
            >
              <FaCog className="me-2" />
              {showConfigPanel ? "Ocultar Configuración" : "Mostrar Configuración"}
            </Button>
          </Col>
        </Row>

        <Row className="g-4">
          
          {/* Panel de Configuración */}
          {showConfigPanel && (
            <Col xs={12} lg={3}>
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-light">
                  <h6 className="mb-0 d-flex align-items-center">
                    <FaCog className="me-2 icon-primary" />
                    Configuración de Parámetros
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Row className="g-3">
                      {/* <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Factor de Redondeo para iniciar el proceso</Form.Label>
                          <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                            value={config.factorRedondeo}
                            onChange={(e) => {
                              console.log('INPUT CHANGE DETECTADO:', e.target.value);
                              handleConfigChange('factorRedondeo')(e);
                            }}
                            onFocus={() => console.log('INPUT FOCUSED, valor actual:', config.factorRedondeo)}
                            onBlur={() => console.log('INPUT BLUR, valor actual:', config.factorRedondeo)}
                          />
                          <Form.Text className="text-muted">
                            Umbral para redondeo (0.0 - 1.0)
                          </Form.Text>
                        </Form.Group>
                      </Col> */}
                      
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Joroba (%)</Form.Label>
                          <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                            max="100"
                            value={config.joroba}
                            onChange={handleConfigChange('joroba')}
                          />
                          <Form.Text className="text-muted">
                            Porcentaje de ajuste joroba
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Días Inversión Deseados</Form.Label>
                          <Form.Control
                            type="number"
                            step="1"
                            min="1"
                            value={config.diasInversionDeseados}
                            onChange={handleConfigChange('diasInversionDeseados')}
                          />
                          <Form.Text className="text-muted">
                            Días objetivo de inversión
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      
                      {/* <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Días Reporte Subido</Form.Label>
                          <Form.Control
                    type="number"
                            step="1"
                    min="1"
                            value={config.diasDeInverionReporteSubido}
                            onChange={handleConfigChange('diasDeInverionReporteSubido')}
                          />
                          <Form.Text className="text-muted">
                            Días del reporte actual
                          </Form.Text>
                        </Form.Group>
                      </Col> */}
                      
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Precio Máximo</Form.Label>
                          <Form.Control
                            type="number"
                            step="100"
                            min="0"
                            value={config.precioMaximo}
                            onChange={handleConfigChange('precioMaximo')}
                          />
                          <Form.Text className="text-muted">
                            Precio máximo considerado Ejemplo: "0 a 3500"
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Panel Principal */}
          <Col xs={12} lg={showConfigPanel ? 9 : 12}>
            <Row className="g-4">
              
              {/* Zona de Upload */}
              <Col xs={12} md={6}>
                <Card className="shadow-sm upload-card">
                  <Card.Header className="bg-light">
                    <h6 className="mb-0 d-flex align-items-center">
                      <FaCloudUploadAlt className="me-2 icon-primary" />
                      Cargar Archivo Excel - AWS Lambda
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <div
                      {...getRootProps()}
                      className={`dropzone ${
                        isDragActive ? 'active' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input {...getInputProps()} />
                      <FaCloudUploadAlt size={48} className="text-muted mb-3" />
                      
                      {file ? (
                        <div>
                          <h6 className="text-corporate mb-2">Archivo seleccionado:</h6>
                          <p className="mb-1 fw-bold">{file.name}</p>
                          <p className="text-muted small">
                            Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB
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

                    {loading && (
                      <div className="progress-area">
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
                        {progressDetails && (
                          <div className="mt-2 p-2 bg-light rounded">
                            <small className="text-info">
                              {progressDetails}
                            </small>
                          </div>
                        )}
          </div>
        )}

                    {/* Estado del proceso Lambda */}
                    {processId && (
                      <div className="mt-3">
                        <Card bg="light">
                          <Card.Body className="py-2">
                            <small className="text-muted">
                              <strong>Process ID:</strong> {processId}<br/>
                              <strong>Estado:</strong> {lambdaService.getReadableStatus(status)}
                            </small>
                          </Card.Body>
                        </Card>
          </div>
        )}

                    <div className="button-area">
                      <div className="d-flex">
                        <Button
                          variant="primary"
                          onClick={handleSubmit}
                          disabled={!file || loading}
                          className="d-flex align-items-center justify-content-center"
                        >
                          {loading ? (
                            <FaSpinner className="me-2 fa-spin" />
                          ) : (
                            <FaArrowUp className="me-2" />
                          )}
                          {loading ? 'Procesando con AWS...' : 'Procesar con Lambda'}
                        </Button>
            
            {result && (
                          <Button
                            variant="primary"
                            onClick={handleDownload}
                            disabled={!result}
                            className="d-flex align-items-center justify-content-center"
                            title="Descargar tabla consolidada en Excel"
                          >
                            <FaDownload className="me-2" />
                            Descargar tabla consolidada en Excel
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Panel de Información */}
              <Col xs={12} md={6}>
                <Card className="shadow-sm info-card">
                  <Card.Header className="bg-light">
                    <h6 className="mb-0 text-corporate fw-bold">
                       Información del cliente
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    {/* <div className="info-section">
                      <p className="small mb-2">
                        <strong>Factor de Redondeo:</strong> Puedes seleccionar un factor cercano para reducir las iteraciones.
                      </p>
                      <p className="small mb-2">
                        <strong>Joroba:</strong> Porcentaje de SKUs que se ajustarán de 1 a 2 unidades.
                      </p>
                      <p className="small mb-0">
                        <strong>Optimización:</strong> El sistema encuentra automáticamente el mejor factor de redondeo.
                      </p>
                    </div> */}

                    <div className="info-section">
                      <div className="bg-light rounded p-3 border">
                        <h6 className="text-corporate fw-bold mb-2">Datos de la farmacia</h6>
                        <div className="small text-muted">
                          <div>Numero de cliente: <strong>{
                            result 
                              ? (result.tipoProcesso === 'MULTI_CLIENT_AGGREGATED' 
                                  ? 'Multi-cliente' 
                                  : result.datos?.[0]?.Cliente || 'No disponible')
                              : 'No disponible'
                          }</strong></div>
                        </div>
                      </div>
                </div>
                
                    <div className="info-section">
                      <div className="bg-light rounded p-3 border">
                        <h6 className="text-corporate fw-bold mb-3">CONVERGENCIA DEL ALGORITMO</h6>
                        {result && (result.convergenciaData || result.convergenciaConsolidada?.[0]) && 
                         Array.isArray(result.convergenciaData || result.convergenciaConsolidada?.[0]) && 
                         (result.convergenciaData || result.convergenciaConsolidada?.[0]).length > 0 ? (
                          (() => {
                            // Usar convergenciaData para single-client o convergenciaConsolidada[0] para multi-client
                            const convergenciaArray = result.convergenciaData || result.convergenciaConsolidada?.[0] || [];
                            return (
                          <div style={{ height: '300px' }}>
                            <Line
                              data={{
                                    labels: convergenciaArray.map((_, index) => `Iter ${index + 1}`),
                                datasets: [
                                  {
                                    label: 'Diferencia vs Objetivo',
                                        data: convergenciaArray.map(iter => iter.diferencia),
                                    borderColor: '#648a26',
                                    backgroundColor: 'rgba(100, 138, 38, 0.1)',
                                    borderWidth: 3,
                                        pointBackgroundColor: convergenciaArray.map(iter => 
                                      iter.esMejor ? '#28a745' : '#648a26'
                                    ),
                                        pointBorderColor: convergenciaArray.map(iter => 
                                      iter.esMejor ? '#28a745' : '#648a26'
                                    ),
                                        pointRadius: convergenciaArray.map(iter => 
                                      iter.esMejor ? 8 : 4
                                    ),
                                        pointHoverRadius: convergenciaArray.map(iter => 
                                      iter.esMejor ? 10 : 6
                                    ),
                                    fill: true,
                                    tension: 0.4
                                  },
                                  {
                                    label: 'Objetivo (Diferencia = 0)',
                                        data: new Array(convergenciaArray.length).fill(0),
                                    borderColor: '#dc3545',
                                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                    pointRadius: 0,
                                    fill: false
                                  }
                                ]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'top',
                                    labels: {
                                      font: { size: 12 },
                                      color: '#333'
                                    }
                                  },
                                  tooltip: {
                                    filter: function(tooltipItem) {
                                      // Solo mostrar tooltip para el primer dataset (línea verde)
                                      return tooltipItem.datasetIndex === 0;
                                    },
                                    callbacks: {
                                      title: function(context) {
                                        const index = context[0].dataIndex;
                                        const iter = convergenciaArray[index];
                                        return `Iteración ${index + 1}${iter.esMejor ? ' ⭐ MEJOR' : ''}`;
                                      },
                                      label: function(context) {
                                        const index = context.dataIndex;
                                        const iter = convergenciaArray[index];
                                        
                                        // 🔢 CÁLCULO CORRECTO DE DÍAS ALCANZADOS
                                        // montoVentaMostrador = Venta total del período (ej. $4.9M en 30 días)
                                        // inversionActual = Inversión calculada en esta iteración (ej. $4.5M)
                                        // diasDelPeriodo = Días del reporte subido (ej. 30 días)
                                        // Formula: diasAlcanzados = (inversionActual / montoVentaMostrador) × diasDelPeriodo
                                        
                                        const montoVentaMostrador = result.inversionOriginal || 0;
                                        const diasDelPeriodo = config.diasDeInverionReporteSubido || 30;
                                        const inversionActual = iter.inversion || 0;
                                        
                                        // Calcular días alcanzados con la inversión actual
                                        const diasAlcanzados = montoVentaMostrador > 0 
                                          ? (inversionActual / montoVentaMostrador) * diasDelPeriodo 
                                          : 0;
                                        
                                        // Meta de días deseados
                                        const meta = config.diasInversionDeseados || 0;
                                        
                                        // Diferencia: cuánto nos pasamos o faltamos de la meta
                                        const diferenciaDias = diasAlcanzados - meta;
                                        
                                        return [
                                          `Factor: ${iter.factor.toFixed(2)}`,
                                          `Inversión: $${iter.inversion.toLocaleString('es-ES', {minimumFractionDigits: 2})}`,
                                          `Diferencia: $${iter.diferencia.toLocaleString('es-ES', {minimumFractionDigits: 2})}`,
                                          `Días Alcanzados: ${diasAlcanzados.toFixed(2)}`,
                                          `Meta: ${meta} días`,
                                          `Resultado: ${diferenciaDias > 0 ? '+' : ''}${diferenciaDias.toFixed(2)} días`,
                                          `Registros > 0: ${(iter.registrosMayorCero || 0).toLocaleString('es-ES')}` // ✅ NUEVO
                                        ];
                                      }
                                    },
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    titleColor: '#fff',
                                    bodyColor: '#fff',
                                    borderColor: '#648a26',
                                    borderWidth: 1
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Diferencia ($)',
                                      color: '#666',
                                      font: { size: 12, weight: 'bold' }
                                    },
                                    ticks: {
                                      callback: function(value) {
                                        return '$' + value.toLocaleString('es-ES');
                                      },
                                      color: '#666',
                                      font: { size: 10 }
                                    },
                                    grid: {
                                      color: 'rgba(0, 0, 0, 0.1)'
                                    }
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: 'Iteraciones',
                                      color: '#666',
                                      font: { size: 12, weight: 'bold' }
                                    },
                                    ticks: {
                                      color: '#666',
                                      font: { size: 10 }
                                    },
                                    grid: {
                                      color: 'rgba(0, 0, 0, 0.1)'
                                    }
                                  }
                                },
                                interaction: {
                                  intersect: false,
                                  mode: 'index'
                                }
                              }}
                            />
                          </div>
                            );
                          })()
                        ) : (
                          <div className="text-left py-4">
                            <div className="small text-muted">
                              <div>• <strong>Arquitectura AWS Lambda:</strong> Procesamiento escalable y serverless</div>
                              <div>• <strong>Step Functions:</strong> Orquestación automática de procesos</div>
                              <div>• <strong>Brent's Method:</strong> Algoritmo matemático de convergencia garantizada</div>
                              <div>• <strong>Análisis predictivo:</strong> Evalúa millones de combinaciones en segundos</div>
                              <div>• <strong>Precisión financiera:</strong> Minimiza diferencias vs objetivo de inversión</div>
                            </div>
              </div>
            )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Alertas */}
              {error && (
                <Col xs={12}>
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </Alert>
                </Col>
              )}

              {/* Resultados */}
              {result && (
                <Col xs={12}>
                  <Card className="shadow">
                    <Card.Header className="bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 d-flex align-items-center">
                        <FaChartLine className="me-2 icon-primary" />
                        Resultados del Procesamiento - AWS Lambda
                      </h5>
                        {/* <Button variant="outline-primary" size="sm" onClick={downloadJSON}>
                          <FaDownload className="me-1" />
                          Descargar JSON
                        </Button> */}
                      </div>
                    </Card.Header>
                    <Card.Body>
                      
                      {/* Detalles por Cliente - SIN TABS, DIRECTO */}
                      <AdvancedClientTable 
                        result={result}
                        processId={processId}
                        onViewDetails={handleViewDetailsClient}
                      />
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Col>
        </Row>
      </Container>

      {/* Modal de Convergencia */}
      <ConvergenceModal
        show={showConvergenceModal}
        onHide={() => setShowConvergenceModal(false)}
        clientData={selectedClient}
        result={result}
        config={config}
      />
                </>
              )}

              {/* Placeholder para Farmacias Independientes - SPP */}
              {activeModule === 'ind-spp' && (
                <Container fluid className="py-4">
                  <Alert variant="info">
                    <h4>Farmacias Independientes - SPP</h4>
                    <p>Módulo en desarrollo. Próximamente podrás calcular el factor de redondeo para farmacias independientes con SPP.</p>
                  </Alert>
                </Container>
              )}

              {/* Placeholder para Farmacias Independientes - IPP */}
              {activeModule === 'ind-ipp' && (
                <Container fluid className="py-4">
                  <Alert variant="info">
                    <h4>Farmacias Independientes - IPP</h4>
                    <p>Módulo en desarrollo. Próximamente podrás calcular el factor de redondeo para farmacias independientes con IPP.</p>
                  </Alert>
                </Container>
              )}
            </div>
          </div>
    </div>
      )}
    </CustomAuthenticator>
  );
}

export default App;