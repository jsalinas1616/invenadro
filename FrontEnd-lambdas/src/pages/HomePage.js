import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaCalculator, FaChartLine, FaCog, FaArrowRight } from 'react-icons/fa';

const HomePage = ({ onNavigate, user }) => {
  const modules = [
    {
      id: 'farmatodo-spp',
      title: 'Cálculo Factor de Redondeo',
      description: 'Procesa archivos Excel para calcular el factor de redondeo óptimo',
      icon: FaCalculator,
      color: '#648a26',
      gradient: 'linear-gradient(135deg, #648a26 0%, #7ba330 100%)'
    },
    {
      id: 'ind-ipp',
      title: 'IPP Farmacias Independientes',
      description: 'Cálculo de inventarios para farmacias independientes',
      icon: FaChartLine,
      color: '#0d6efd',
      gradient: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)'
    },
    {
      id: 'configuraciones',
      title: 'Configuraciones de Mostrador',
      description: 'Gestiona las configuraciones de mostradores para cálculos',
      icon: FaCog,
      color: '#17a2b8',
      gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
      paddingTop: '60px',
      paddingBottom: '60px'
    }}>
      <Container>
        {/* Logo y Bienvenida */}
        <Row className="justify-content-center mb-5">
          <Col lg={8} className="text-center">
            <div className="mb-4" style={{ animation: 'fadeInDown 0.8s ease-out' }}>
              <img 
                src="/logo-invenadro.png" 
                alt="Invenadro Logo" 
                style={{ 
                  maxWidth: '200px',
                  height: 'auto',
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                }}
              />
            </div>
            
            <h1 
              className="mb-3" 
              style={{ 
                fontSize: '2.5rem',
                fontWeight: '300',
                color: '#2c3e50',
                animation: 'fadeInUp 0.8s ease-out 0.2s both'
              }}
            >
              Bienvenido a <strong style={{ fontWeight: '600', color: '#648a26' }}>Invenadro</strong>
            </h1>
            
            <p 
              style={{ 
                fontSize: '1.1rem',
                color: '#6c757d',
                maxWidth: '600px',
                margin: '0 auto',
                animation: 'fadeInUp 0.8s ease-out 0.4s both'
              }}
            >
              Sistema de Gestión y Optimización de Inventarios
            </p>
          </Col>
        </Row>

        {/* Tarjetas de Acceso Rápido */}
        <Row className="justify-content-center g-4 mb-5">
          {modules.map((module, index) => {
            const IconComponent = module.icon;
            return (
              <Col key={module.id} lg={4} md={6} style={{ animation: `fadeInUp 0.8s ease-out ${0.6 + index * 0.2}s both` }}>
                <Card 
                  onClick={() => onNavigate(module.id)}
                  style={{
                    border: 'none',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    height: '100%'
                  }}
                  className="module-card"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                  }}
                >
                  <div 
                    style={{ 
                      height: '8px',
                      background: module.gradient
                    }} 
                  />
                  
                  <Card.Body style={{ padding: '2rem' }}>
                    <div className="d-flex align-items-start mb-3">
                      <div 
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: module.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          flexShrink: 0
                        }}
                      >
                        <IconComponent style={{ color: 'white', fontSize: '24px' }} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <h5 style={{ 
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          marginBottom: '0.5rem',
                          color: '#2c3e50'
                        }}>
                          {module.title}
                        </h5>
                      </div>
                    </div>
                    
                    <p style={{ 
                      color: '#6c757d',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      marginBottom: '1.5rem'
                    }}>
                      {module.description}
                    </p>
                    
                    <div className="d-flex align-items-center" style={{ color: module.color, fontWeight: '500' }}>
                      <span>Acceder</span>
                      <FaArrowRight className="ms-2" style={{ fontSize: '14px' }} />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* Información adicional */}
        <Row className="justify-content-center">
          <Col lg={8}>
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem 2rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                border: '1px solid #e9ecef',
                animation: 'fadeInUp 0.8s ease-out 1.4s both'
              }}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <p className="mb-1" style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                    💡 <strong>Sugerencia:</strong> Comienza seleccionando un módulo del menú lateral
                  </p>
                </div>
                {user && (
                  <div style={{ 
                    fontSize: '0.9rem',
                    color: '#495057',
                    padding: '0.5rem 1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    👤 {user.username || user.email}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Animaciones CSS */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .module-card {
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};

export default HomePage;

