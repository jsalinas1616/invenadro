import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Form, 
  InputGroup, 
  Button, 
  Badge, 
  Row, 
  Col,
  Card
} from 'react-bootstrap';
import { 
  FaSearch, 
  FaEye, 
  FaDownload,
  FaFilter,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';

const AdvancedClientTable = ({ result, onDownloadClient, onViewDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
                        onClick={() => onViewDetails && onViewDetails(cliente)}
                        title="Ver detalles"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => onDownloadClient && onDownloadClient(cliente)}
                        title="Descargar Excel"
                      >
                        <FaDownload />
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
  );
};

export default AdvancedClientTable;
