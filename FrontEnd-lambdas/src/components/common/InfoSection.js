/**
 * Information Section Component
 * @module components/common/InfoSection
 */

import React from 'react';
import { Card } from 'react-bootstrap';

/**
 * Client information and algorithm convergence section
 * @param {Object} props - Component props
 * @param {Object} props.result - Processing result data
 * @returns {JSX.Element} InfoSection component
 */
const InfoSection = ({ result }) => {
  return (
    <Card className="shadow-sm info-card">
      <Card.Header className="bg-light">
        <h6 className="mb-0 text-corporate fw-bold">
          Información del cliente
        </h6>
      </Card.Header>
      
      <Card.Body>
        {/* Datos de la farmacia */}
        <div className="info-section">
          <div className="bg-light rounded p-3 border">
            <h6 className="text-corporate fw-bold mb-2">Datos de la farmacia</h6>
            <div className="small text-muted">
              <div>
                Numero de cliente: <strong>{result ? result.cliente : ''}</strong>
              </div>
            </div>
          </div>
        </div>
        
        {/* Convergencia del algoritmo */}
        <div className="info-section mt-3">
          <div className="bg-light rounded p-3 border">
            <h6 className="text-corporate fw-bold mb-3">CONVERGENCIA DEL ALGORITMO</h6>
            <div className="small text-muted">
              <div className="mb-2">
                • <strong>Arquitectura AWS Lambda:</strong> Procesamiento escalable y serverless
              </div>
              <div className="mb-2">
                • <strong>Step Functions:</strong> Orquestación automática de procesos
              </div>
              <div className="mb-2">
                • <strong>Brent's Method:</strong> Algoritmo matemático de convergencia garantizada
              </div>
              <div className="mb-2">
                • <strong>Análisis predictivo:</strong> Evalúa millones de combinaciones en segundos
              </div>
              <div>
                • <strong>Precisión financiera:</strong> Minimiza diferencias vs objetivo de inversión
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default InfoSection;
