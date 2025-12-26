import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal, Toast, ToastContainer } from 'react-bootstrap';
import { FaPlus, FaCog, FaExclamationTriangle } from 'react-icons/fa';
import ConfigTable from '../components/configuraciones/ConfigTable';
import ConfigModal from '../components/configuraciones/ConfigModal';
import configService from '../services/configService';

const ConfiguracionesPage = () => {
  // Estados
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  // Estados de paginación y filtros
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  });
  
  const [filters, setFilters] = useState({
    search: '',
    tipo: 'all'
  });
  
  // Ref para debounce de búsqueda
  const searchTimerRef = React.useRef(null);

  // Funciones de Toast
  const addToast = useCallback((message, variant = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Cargar configuraciones con paginación
  const loadConfigs = useCallback(async (page = 1, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await configService.getAllConfigs({
        page,
        pageSize: pagination.pageSize,
        search: currentFilters.search,
        tipo: currentFilters.tipo
      });
      
      setConfigs(result.configs || []);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Error cargando configuraciones:', err);
      setError(`Error al cargar configuraciones: ${err.message}`);
      addToast('Error al cargar configuraciones', 'danger');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, addToast]);

  // Cargar configuraciones al montar
  useEffect(() => {
    loadConfigs(1, filters);
  }, []);

  // Abrir modal para crear
  const handleCreate = () => {
    setSelectedConfig(null);
    setIsEdit(false);
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (config) => {
    setSelectedConfig(config);
    setIsEdit(true);
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedConfig(null);
    setIsEdit(false);
  };

  // Guardar configuración (crear o actualizar)
  const handleSave = async (formData) => {
    setLoading(true);
    try {
      if (isEdit && selectedConfig) {
        // Actualizar
        await configService.updateConfig(selectedConfig.mostradorId, formData);
        addToast('Configuración actualizada exitosamente', 'success');
      } else {
        // Crear
        await configService.createConfig(formData);
        addToast('Configuración creada exitosamente', 'success');
      }
      
      handleCloseModal();
      await loadConfigs(); // Recargar lista
      
    } catch (err) {
      console.error('Error guardando configuración:', err);
      addToast(`Error al guardar: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar eliminación
  const handleDeleteClick = (config) => {
    setConfigToDelete(config);
    setShowDeleteConfirm(true);
  };

  // Eliminar configuración
  const handleDeleteConfirm = async () => {
    if (!configToDelete) return;
    
    setLoading(true);
    try {
      await configService.deleteConfig(configToDelete.mostradorId);
      addToast('Configuración eliminada exitosamente', 'success');
      setShowDeleteConfirm(false);
      setConfigToDelete(null);
      await loadConfigs(pagination.page, filters); // Recargar lista
    } catch (err) {
      console.error('Error eliminando configuración:', err);
      addToast(`Error al eliminar: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Handler de cambio de página
  const handlePageChange = (newPage) => {
    loadConfigs(newPage, filters);
  };

  // Handler de cambio de filtros
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    // Si es búsqueda, aplicar debounce
    if (filterName === 'search') {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      
      searchTimerRef.current = setTimeout(() => {
        loadConfigs(1, newFilters); // Volver a página 1 al buscar
      }, 500);
    } else {
      // Para otros filtros, aplicar inmediatamente
      loadConfigs(1, newFilters); // Volver a página 1 al filtrar
    }
  };

  // Handler de cambio de tamaño de página
  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize }));
    // Recargar desde página 1 con el nuevo tamaño
    setTimeout(() => {
      loadConfigs(1, filters);
    }, 0);
  };

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <FaCog className="me-2 text-primary" />
                Configuraciones de Mostrador
              </h2>
              <p className="text-muted mb-0">
                Gestiona las configuraciones de mostradores para el cálculo de inventarios
              </p>
            </div>
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleCreate}
              disabled={loading}
            >
              <FaPlus className="me-2" />
              Nueva Configuración
            </Button>
          </div>
        </Col>
      </Row>

      {/* Mensajes de error */}
      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Estadísticas rápidas */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm" style={{ 
            borderLeft: '5px solid #648a26',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
          }}>
            <Card.Body className="text-center py-4">
              <h2 className="fw-bold mb-2" style={{ fontSize: '3rem', color: '#648a26' }}>
                {pagination.total}
              </h2>
              <div style={{ fontSize: '1.1rem', color: '#6c757d', fontWeight: '500' }}>
                Configuraciones Totales
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm" style={{ 
            borderLeft: '5px solid #0d6efd',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
          }}>
            <Card.Body className="text-center py-4">
              <h2 className="fw-bold mb-2" style={{ fontSize: '3rem', color: '#0d6efd' }}>
                {configs.filter(c => c.tipoInvenadro === 'SPP').length}
              </h2>
              <div style={{ fontSize: '1.1rem', color: '#6c757d', fontWeight: '500' }}>
                Tipo SPP
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm" style={{ 
            borderLeft: '5px solid #17a2b8',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
          }}>
            <Card.Body className="text-center py-4">
              <h2 className="fw-bold mb-2" style={{ fontSize: '3rem', color: '#17a2b8' }}>
                {configs.filter(c => c.tipoInvenadro === 'IPP').length}
              </h2>
              <div style={{ fontSize: '1.1rem', color: '#6c757d', fontWeight: '500' }}>
                Tipo IPP
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla de configuraciones */}
      <Row>
        <Col>
          <Card className="shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Listado de Configuraciones</h5>
            </Card.Header>
            <Card.Body>
              <ConfigTable
                configs={configs}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                loading={loading}
                filters={filters}
                onFilterChange={handleFilterChange}
                pagination={pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal crear/editar */}
      <ConfigModal
        show={showModal}
        onHide={handleCloseModal}
        config={selectedConfig}
        onSubmit={handleSave}
        loading={loading}
        isEdit={isEdit}
      />

      {/* Modal confirmación de eliminación */}
      <Modal 
        show={showDeleteConfirm} 
        onHide={() => setShowDeleteConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="me-2 text-warning" />
            Confirmar Eliminación
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro que deseas eliminar la configuración?</p>
          {configToDelete && (
            <Alert variant="warning" className="mb-0">
              <strong>Mostrador:</strong> {configToDelete.mostrador}<br />
              <strong>Tipo:</strong> {configToDelete.tipoInvenadro}<br />
              <strong>ID:</strong> {configToDelete.mostradorId}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteConfirm(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteConfirm}
            disabled={loading}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toasts de notificación */}
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
                 'ℹ️ Información'}
              </strong>
            </Toast.Header>
            <Toast.Body className={toast.variant === 'success' || toast.variant === 'danger' ? 'text-white' : ''}>
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </Container>
  );
};

export default ConfiguracionesPage;

