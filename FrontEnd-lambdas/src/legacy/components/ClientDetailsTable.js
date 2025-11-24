import React, { useState } from 'react';
import { Card, Table, Form, InputGroup, Badge, Button } from 'react-bootstrap';
import { FaSearch, FaEye, FaDownload, FaFilter } from 'react-icons/fa';
import { formatNumber, formatTime } from '../utils/formatters';

/**
 * Componente para la tabla detallada de clientes con filtros y búsqueda
 */
const ClientDetailsTable = ({ result, isMultiClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');

  if (!result) return null;

  // Obtener datos de clientes
  const clientData = isMultiClient 
    ? result.resumenPorCliente || []
    : [{
        cliente: 'Cliente Único',
        status: 'SUCCESS',
        registrosOriginales: result.totalFilasOriginales,
        registrosExportados: result.totalFilasExportadas,
        factorOptimo: result.configUsada?.factorRedondeo,
        tiempoCalculoMs: result.tiempoCalculoMs,
        error: null
      }];

  // Filtrar datos
  const filteredData = clientData.filter(cliente => {
    const matchesSearch = cliente.cliente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos los estados' || cliente.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Estados únicos para el filtro
  const uniqueStatuses = ['Todos los estados', ...new Set(clientData.map(c => c.status))];

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'ERROR': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'SUCCESS': return 'Exitoso';
      case 'ERROR': return 'Error';
      default: return status;
    }
  };

  return (
    <Card>
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0 text-corporate">
            📋 Detalles por Cliente ({filteredData.length})
          </h5>
          <div className="d-flex gap-2">
            <InputGroup style={{ width: '250px' }}>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '180px' }}
            >
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Form.Select>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table className="mb-0" hover>
            <thead className="table-light">
              <tr>
                <th className="ps-3">Cliente 🏢</th>
                <th>Registros</th>
                <th>Factor Óptimo</th>
                <th>Inversión Deseada</th>
                <th>Resultado</th>
                <th>Diferencia</th>
                <th>Días Equiv.</th>
                <th>Tiempo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((cliente, idx) => {
                // Calcular métricas simuladas (en el resultado real vendrían del backend)
                const inversionDeseada = '$4,225,064'; // Simulado
                const resultado = '$4,216,635'; // Simulado
                const diferencia = '-$8,429'; // Simulado
                const diasEquiv = '26.4 días'; // Simulado

                return (
                  <tr key={idx}>
                    <td className="ps-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle me-2" 
                             style={{ width: '8px', height: '8px' }}></div>
                        <strong>{cliente.cliente}</strong>
                      </div>
                    </td>
                    <td>{formatNumber(cliente.registrosExportados || 0)}</td>
                    <td>
                      <Badge bg="primary" className="rounded-pill">
                        {cliente.factorOptimo || 'N/A'}
                      </Badge>
                    </td>
                    <td>{inversionDeseada}</td>
                    <td className="text-success fw-bold">{resultado}</td>
                    <td className="text-danger">{diferencia}</td>
                    <td className="text-info">{diasEquiv}</td>
                    <td>{formatTime(cliente.tiempoCalculoMs || 0)}</td>
                    <td>
                      <Badge 
                        bg={getStatusBadgeVariant(cliente.status)}
                        className="rounded-pill"
                      >
                        {getStatusText(cliente.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button variant="outline-primary" size="sm" title="Ver detalles">
                          <FaEye />
                        </Button>
                        <Button variant="outline-success" size="sm" title="Descargar">
                          <FaDownload />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-4 text-muted">
            <FaFilter className="mb-2" size={24} />
            <p>No se encontraron clientes con los filtros aplicados.</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ClientDetailsTable;
