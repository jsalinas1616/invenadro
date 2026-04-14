import React from 'react';
import { Nav } from 'react-bootstrap';
import { FaStore, FaCalculator, FaTh, FaHome } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ activeModule, onModuleChange, visible }) => {
  return (
    <div className={`sidebar ${visible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
      <div className="sidebar-header">
        <div className="d-flex align-items-center gap-2">
          <FaTh className="sidebar-header-icon" />
          <h6 className="mb-0 sidebar-header-title">MÓDULOS</h6>
        </div>
      </div>

      {/* Inicio */}
      <div className="sidebar-section">
        <Nav className="flex-column sidebar-nav">
          <Nav.Link
            className={activeModule === 'home' ? 'active' : ''}
            onClick={() => onModuleChange('home')}
            style={{ fontWeight: '500' }}
          >
            <FaHome className="me-2" />
            INICIO
          </Nav.Link>
        </Nav>
      </div>

      {/* Farmatodo */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <div className="d-flex align-items-center">
            <FaStore className="me-2" />
            FARMATODO
          </div>
        </div>
        <Nav className="flex-column sidebar-nav">
          <Nav.Link
            className={activeModule === 'farmatodo-spp' ? 'active' : ''}
            onClick={() => onModuleChange('farmatodo-spp')}
          >
            <FaCalculator className="me-2" />
            Cálculo Factor de Redondeo
          </Nav.Link>
        </Nav>
      </div>
    </div>
  );
};

export default Sidebar;

