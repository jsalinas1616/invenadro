import React, { useState } from 'react';
import { Nav } from 'react-bootstrap';
import { FaHospital, FaStore, FaChevronRight, FaChevronDown, FaCalculator, FaTh, FaCog, FaHome } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ activeModule, onModuleChange, visible }) => {
  const [independientesExpanded, setIndependientesExpanded] = useState(false); // Colapsado por default
  const [farmatodoExpanded, setFarmatodoExpanded] = useState(true); // Expandido por default

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
            Inicio
          </Nav.Link>
        </Nav>
      </div>

      {/* Farmacias Independientes (Colapsable) */}
      <div className="sidebar-section">
        <div 
          className="sidebar-section-title clickable"
          onClick={() => setIndependientesExpanded(!independientesExpanded)}
        >
          <div className="d-flex align-items-center">
            <FaHospital className="me-2" />
            FARMACIAS INDEPENDIENTES
          </div>
          {independientesExpanded ? <FaChevronDown /> : <FaChevronRight />}
        </div>
        
        {independientesExpanded && (
          <Nav className="flex-column sidebar-nav">
            <Nav.Link 
              className={activeModule === 'ind-spp' ? 'active' : ''}
              onClick={() => onModuleChange('ind-spp')}
            >
              <FaCalculator className="me-2" />
              SPP
            </Nav.Link>
            <Nav.Link 
              className={activeModule === 'ind-ipp' ? 'active' : ''}
              onClick={() => onModuleChange('ind-ipp')}
            >
              <FaCalculator className="me-2" />
              IPP
            </Nav.Link>
          </Nav>
        )}
      </div>

      {/* Farmatodo (Expandible) */}
      <div className="sidebar-section">
        <div 
          className="sidebar-section-title clickable"
          onClick={() => setFarmatodoExpanded(!farmatodoExpanded)}
        >
          <div className="d-flex align-items-center">
            <FaStore className="me-2" />
            FARMATODO
          </div>
          {farmatodoExpanded ? <FaChevronDown /> : <FaChevronRight />}
        </div>
        
        {farmatodoExpanded && (
          <Nav className="flex-column sidebar-nav">
            <Nav.Link 
              className={activeModule === 'farmatodo-spp' ? 'active' : ''}
              onClick={() => onModuleChange('farmatodo-spp')}
            >
              <FaCalculator className="me-2" />
              Cálculo Factor de Redondeo SPP
            </Nav.Link>
          </Nav>
        )}
      </div>

      {/* Configuraciones */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <div className="d-flex align-items-center">
            <FaCog className="me-2" />
            CONFIGURACIONES
          </div>
        </div>
        
        <Nav className="flex-column sidebar-nav">
          <Nav.Link 
            className={activeModule === 'configuraciones' ? 'active' : ''}
            onClick={() => onModuleChange('configuraciones')}
          >
            <FaCog className="me-2" />
            Configuraciones de Mostrador
          </Nav.Link>
        </Nav>
      </div>
    </div>
  );
};

export default Sidebar;

