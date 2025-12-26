import React from 'react';
import { Table, Button, Badge, InputGroup, Form, Row, Col, Pagination } from 'react-bootstrap';
import { FaEdit, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';

const ConfigTable = ({ 
  configs, 
  onEdit, 
  onDelete, 
  loading,
  filters,
  onFilterChange,
  pagination,
  onPageChange,
  onPageSizeChange
}) => {

  // Formatear moneda
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Contar productos incluidos
  const countIncluidos = (config) => {
    const campos = [
      'incluye_Refrigerados', 'incluye_Psicotropicos', 'incluye_Especialidades',
      'incluye_Genericos', 'incluye_Dispositivos_Medicos', 
      'incluye_Complementos_Alimenticios', 'incluye_Dermatologico',
      'incluye_OTC', 'incluye_Etico_Patente'
    ];
    return campos.filter(campo => config[campo] === 'S').length;
  };

  // Generar items de paginación
  const renderPaginationItems = () => {
    const items = [];
    const { page, totalPages } = pagination;
    
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);
    
    if (endPage - startPage < 4) {
      if (page < 3) {
        endPage = Math.min(5, totalPages);
      } else {
        startPage = Math.max(1, totalPages - 4);
      }
    }
    
    for (let number = startPage; number <= endPage; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === page}
          onClick={() => onPageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    
    return items;
  };

  return (
    <div>
      {/* Filtros y búsqueda */}
      <Row className="mb-3 align-items-center">
        <Col md={5}>
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por mostrador..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <InputGroup>
            <InputGroup.Text>
              <FaFilter />
            </InputGroup.Text>
            <Form.Select 
              value={filters.tipo}
              onChange={(e) => onFilterChange('tipo', e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              <option value="SPP">SPP</option>
              <option value="IPP">IPP</option>
            </Form.Select>
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Select 
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            size="sm"
          >
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <div className="text-muted small text-end">
            {configs.length} de {pagination.total}
          </div>
        </Col>
      </Row>

      {/* Tabla */}
      <div className="table-responsive">
        <Table hover className="mb-0">
          <thead className="table-light">
            <tr>
              <th>Mostrador</th>
              <th className="text-center">Tipo Invenadro</th>
              <th className="text-end">Monto Requerido</th>
              <th className="text-center">Productos Incluidos</th>
              <th className="text-center">Fecha Creación</th>
              <th className="text-center">Última Actualización</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : configs.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  {filters.search || filters.tipo !== 'all' 
                    ? 'No se encontraron configuraciones con los filtros aplicados'
                    : 'No hay configuraciones. Crea una nueva para comenzar.'}
                </td>
              </tr>
            ) : (
              configs.map((config) => (
                <tr key={config.mostradorId}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="text-success me-2">●</div>
                      <div>
                        <strong>{config.mostrador}</strong>
                        <br />
                        <small className="text-muted">{config.mostradorId}</small>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <Badge bg={config.tipoInvenadro === 'SPP' ? 'primary' : 'info'} className="px-3 py-2">
                      {config.tipoInvenadro}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <strong>{formatCurrency(config.montoRequerido)}</strong>
                  </td>
                  <td className="text-center">
                    <Badge bg="success" className="px-2 py-1">
                      {countIncluidos(config)} de 9
                    </Badge>
                  </td>
                  <td className="text-center">
                    <small className="text-muted">{formatDate(config.createdAt)}</small>
                  </td>
                  <td className="text-center">
                    <small className="text-muted">{formatDate(config.updatedAt)}</small>
                  </td>
                  <td className="text-center">
                    <div className="d-flex gap-1 justify-content-center">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => onEdit(config)}
                        title="Editar configuración"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => onDelete(config)}
                        title="Eliminar configuración"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Controles de Paginación */}
      {!loading && pagination.total > 0 && (
        <Row className="mt-3">
          <Col className="d-flex justify-content-between align-items-center">
            <div className="text-muted">
              Página {pagination.page} de {pagination.totalPages}
              <span className="ms-2">
                ({((pagination.page - 1) * pagination.pageSize) + 1} - 
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total})
              </span>
            </div>
            
            <Pagination className="mb-0">
              <Pagination.First 
                onClick={() => onPageChange(1)}
                disabled={!pagination.hasPrevious}
              />
              <Pagination.Prev 
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevious}
              />
              
              {renderPaginationItems()}
              
              <Pagination.Next 
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
              />
              <Pagination.Last 
                onClick={() => onPageChange(pagination.totalPages)}
                disabled={!pagination.hasNext}
              />
            </Pagination>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ConfigTable;

