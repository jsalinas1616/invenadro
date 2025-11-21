import React, { useState } from 'react';
import { Table, Button, Badge, InputGroup, Form, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';

const ConfigTable = ({ configs, onEdit, onDelete, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');

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

  // Filtrar configuraciones
  const filteredConfigs = configs.filter(config => {
    const matchesSearch = 
      config.mostrador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.mostradorId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === 'all' || config.tipoInvenadro === tipoFilter;
    
    return matchesSearch && matchesTipo;
  });

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

  return (
    <div>
      {/* Filtros y búsqueda */}
      <Row className="mb-3">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por mostrador o ID..."
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
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              <option value="SPP">SPP</option>
              <option value="IPP">IPP</option>
            </Form.Select>
          </InputGroup>
        </Col>
        <Col md={2}>
          <div className="text-muted small">
            {filteredConfigs.length} de {configs.length} configuraciones
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
            ) : filteredConfigs.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  {searchTerm || tipoFilter !== 'all' 
                    ? 'No se encontraron configuraciones con los filtros aplicados'
                    : 'No hay configuraciones. Crea una nueva para comenzar.'}
                </td>
              </tr>
            ) : (
              filteredConfigs.map((config) => (
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
    </div>
  );
};

export default ConfigTable;

