import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button, Card } from 'react-bootstrap';
import { FaSave, FaTimes } from 'react-icons/fa';

const ConfigForm = ({ initialData, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    mostrador: '',
    tipoInvenadro: 'SPP',
    montoRequerido: '',
    incluye_Refrigerados: 'N',
    incluye_Psicotropicos: 'N',
    incluye_Especialidades: 'N',
    incluye_Genericos: 'N',
    incluye_Dispositivos_Medicos: 'N',
    incluye_Complementos_Alimenticios: 'N',
    incluye_Dermatologico: 'N',
    incluye_OTC: 'N',
    incluye_Etico_Patente: 'N'
  });

  const [errors, setErrors] = useState({});

  // Si hay datos iniciales (modo edición), cargarlos
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Manejar cambios en campos de texto
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Manejar cambios en checkboxes
  const handleCheckboxChange = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] === 'S' ? 'N' : 'S'
    }));
  };

  // Validar formulario
  const validate = () => {
    const newErrors = {};
    
    if (!formData.mostrador || formData.mostrador.trim() === '') {
      newErrors.mostrador = 'El nombre del mostrador es requerido';
    }
    
    if (!formData.tipoInvenadro) {
      newErrors.tipoInvenadro = 'El tipo de Invenadro es requerido';
    }
    
    if (!formData.montoRequerido || parseFloat(formData.montoRequerido) <= 0) {
      newErrors.montoRequerido = 'El monto requerido debe ser mayor a 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    // Convertir montoRequerido a número
    const dataToSubmit = {
      ...formData,
      montoRequerido: parseFloat(formData.montoRequerido)
    };
    
    onSubmit(dataToSubmit);
  };

  const productos = [
    { key: 'incluye_Refrigerados', label: 'Refrigerados' },
    { key: 'incluye_Psicotropicos', label: 'Psicotrópicos' },
    { key: 'incluye_Especialidades', label: 'Especialidades' },
    { key: 'incluye_Genericos', label: 'Genéricos' },
    { key: 'incluye_Dispositivos_Medicos', label: 'Dispositivos Médicos' },
    { key: 'incluye_Complementos_Alimenticios', label: 'Complementos Alimenticios' },
    { key: 'incluye_Dermatologico', label: 'Dermatológico' },
    { key: 'incluye_OTC', label: 'OTC' },
    { key: 'incluye_Etico_Patente', label: 'Ético Patente' }
  ];

  return (
    <Form onSubmit={handleSubmit}>
      {/* Información básica */}
      <Card className="mb-3">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Información Básica</h6>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nombre del Mostrador <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="mostrador"
                  value={formData.mostrador}
                  onChange={handleChange}
                  isInvalid={!!errors.mostrador}
                  placeholder="Ej: Mostrador Central"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.mostrador}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label>Tipo Invenadro <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  name="tipoInvenadro"
                  value={formData.tipoInvenadro}
                  onChange={handleChange}
                  isInvalid={!!errors.tipoInvenadro}
                >
                  <option value="SPP">SPP</option>
                  <option value="IPP">IPP</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.tipoInvenadro}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label>Monto Requerido <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  name="montoRequerido"
                  value={formData.montoRequerido}
                  onChange={handleChange}
                  isInvalid={!!errors.montoRequerido}
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.montoRequerido}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Productos incluidos */}
      <Card className="mb-3">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Productos Incluidos</h6>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            {productos.map((producto) => (
              <Col md={4} key={producto.key}>
                <Form.Check
                  type="switch"
                  id={producto.key}
                  label={producto.label}
                  checked={formData[producto.key] === 'S'}
                  onChange={() => handleCheckboxChange(producto.key)}
                />
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>

      {/* Botones de acción */}
      <div className="d-flex justify-content-end gap-2">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          <FaTimes className="me-2" />
          Cancelar
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={loading}
        >
          <FaSave className="me-2" />
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </Form>
  );
};

export default ConfigForm;

