import React from 'react';
import { Modal } from 'react-bootstrap';
import ConfigForm from './ConfigForm';

const ConfigModal = ({ show, onHide, config, onSubmit, loading, isEdit }) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg"
      backdrop="static"
      keyboard={!loading}
    >
      <Modal.Header closeButton={!loading}>
        <Modal.Title>
          {isEdit ? 'Editar Configuración' : 'Nueva Configuración'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ConfigForm
          initialData={config}
          onSubmit={onSubmit}
          onCancel={onHide}
          loading={loading}
        />
      </Modal.Body>
    </Modal>
  );
};

export default ConfigModal;

