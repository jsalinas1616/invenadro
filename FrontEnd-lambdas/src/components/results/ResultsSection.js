/**
 * Results Section Component - Enterprise Grade
 * @module components/results/ResultsSection
 */

import React from 'react';
import { Card, Button, Tabs, Tab } from 'react-bootstrap';
import { FaChartLine, FaUsers, FaDownload } from 'react-icons/fa';

// Sub-components
import MetricsCards from './MetricsCards';
import FinancialAnalysis from './FinancialAnalysis';
import ConfigurationSummary from './ConfigurationSummary';
import AdvancedClientTable from './AdvancedClientTable';

/**
 * Main results section with tabs and comprehensive data display
 * @param {Object} props - Component props
 * @param {Object} props.result - Processing result data
 * @param {string} props.processId - Process ID
 * @param {Object} props.config - Processing configuration
 * @param {Function} props.onDownloadJSON - JSON download handler
 * @returns {JSX.Element} ResultsSection component
 */
const ResultsSection = ({ result, processId, config, onDownloadJSON }) => {
  if (!result) return null;

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0 d-flex align-items-center">
            <FaChartLine className="me-2 text-success" />
            Resultados del Procesamiento - AWS Lambda
          </h5>
          <Button variant="outline-primary" size="sm" onClick={onDownloadJSON}>
            <FaDownload className="me-1" />
            Descargar JSON
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body>
        <Tabs defaultActiveKey="resumen" className="mb-3">
          
          {/* Summary Tab */}
          <Tab 
            eventKey="resumen" 
            title={
              <span>
                <FaChartLine className="me-2" />
                Resumen
              </span>
            }
          >
            {/* Main Metrics */}
            <MetricsCards result={result} />
            
            {/* Financial Analysis */}
            <FinancialAnalysis result={result} />
            
            {/* Configuration Summary */}
            <ConfigurationSummary config={config} processId={processId} />
          </Tab>
          
          {/* Client Details Tab */}
          <Tab 
            eventKey="clientes" 
            title={
              <span>
                <FaUsers className="me-2" />
                Detalles por Cliente
              </span>
            }
          >
            <AdvancedClientTable result={result} processId={processId} />
          </Tab>
          
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default ResultsSection;
