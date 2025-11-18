import React, { useState } from 'react';
import { Nav } from 'react-bootstrap';
import { FaHospital, FaStore, FaChevronRight, FaChevronDown, FaCalculator } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ activeModule, onModuleChange }) => {
  const [farmatodoExpanded, setFarmatodoExpanded] = useState(true); // Expandido por default

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h6 className="text-muted mb-3">MÓDULOS</h6>
      </div>

      {/* Farmacias Independientes */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <FaHospital className="me-2" />
          FARMACIAS INDEPENDIENTES
        </div>
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
    </div>
  );
};

export default Sidebar;

