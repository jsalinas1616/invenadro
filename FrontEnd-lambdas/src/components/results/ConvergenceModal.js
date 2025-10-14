/**
 * Convergence Modal Component - Chart.js Integration
 * @module components/results/ConvergenceModal
 */

import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Modal displaying convergence chart for a specific client
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onHide - Modal close handler
 * @param {Object} props.clientData - Client data with convergence info
 * @param {Object} props.config - Processing configuration
 * @returns {JSX.Element} ConvergenceModal component
 */
const ConvergenceModal = ({ show, onHide, clientData, config }) => {
  if (!clientData || !clientData.optimizacion || !clientData.optimizacion.historialIteraciones) {
    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Convergencia del Algoritmo - {clientData?.cliente || 'Cliente'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-5">
          <p className="text-muted">No hay datos de convergencia disponibles para este cliente.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  const { historialIteraciones } = clientData.optimizacion;

  // Prepare chart data
  const chartData = {
    labels: historialIteraciones.map((_, index) => `Iter ${index + 1}`),
    datasets: [
      {
        label: 'Diferencia vs Objetivo',
        data: historialIteraciones.map(iter => iter.diferencia),
        borderColor: '#648a26',
        backgroundColor: 'rgba(100, 138, 38, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: historialIteraciones.map(iter => 
          iter.esMejor ? '#28a745' : '#648a26'
        ),
        pointBorderColor: historialIteraciones.map(iter => 
          iter.esMejor ? '#28a745' : '#648a26'
        ),
        pointRadius: historialIteraciones.map(iter => 
          iter.esMejor ? 8 : 4
        ),
        pointHoverRadius: historialIteraciones.map(iter => 
          iter.esMejor ? 10 : 6
        ),
        fill: true,
        tension: 0.4
      },
      {
        label: 'Objetivo (Diferencia = 0)',
        data: new Array(historialIteraciones.length).fill(0),
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }
    ]
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12 },
          color: '#333'
        }
      },
      tooltip: {
        filter: function(tooltipItem) {
          // Solo mostrar tooltip para el primer dataset (línea verde)
          return tooltipItem.datasetIndex === 0;
        },
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const iter = historialIteraciones[index];
            return `Iteración ${index + 1}${iter.esMejor ? ' ⭐ MEJOR' : ''}`;
          },
          label: function(context) {
            const index = context.dataIndex;
            const iter = historialIteraciones[index];
            
            // Calcular días de inversión alcanzados usando regla de tres
            const montoVentaMostrador = parseFloat(clientData.inversionOriginal || 0);
            const diasAlcanzados = montoVentaMostrador > 0 ? (iter.inversion * 30) / montoVentaMostrador : 0;
            const meta = config?.diasInversionDeseados || 26.5;
            const diferenciaDias = diasAlcanzados - meta;
            
            return [
              `Factor: ${iter.factor.toFixed(2)}`,
              `Inversión: $${iter.inversion.toLocaleString('es-ES', {minimumFractionDigits: 2})}`,
              `Diferencia: $${iter.diferencia.toLocaleString('es-ES', {minimumFractionDigits: 2})}`,
              `Días Alcanzados: ${diasAlcanzados.toFixed(2)}`,
              `Meta: ${meta} días`,
              `Resultado: ${diferenciaDias > 0 ? '+' : ''}${diferenciaDias.toFixed(2)} días`
            ];
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#648a26',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Diferencia ($)',
          color: '#666',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('es-ES');
          },
          color: '#666',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Iteraciones',
          color: '#666',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          color: '#666',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          📈 Convergencia del Algoritmo - Cliente: {clientData.cliente}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Chart Container */}
        <div style={{ height: '400px', marginBottom: '20px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
        
        {/* Summary Info */}
        <div className="row g-3">
          <div className="col-md-6">
            <div className="bg-light rounded p-3">
              <h6 className="fw-bold mb-2" style={{ color: '#648a26' }}>Resultado Final</h6>
              <small className="text-muted">
                <div><strong>Factor Óptimo:</strong> {clientData.factorRedondeoEncontrado}</div>
                <div><strong>Iteraciones:</strong> {historialIteraciones.length}</div>
                <div><strong>Convergió:</strong> {historialIteraciones.some(i => i.esMejor) ? '✅ Sí' : '❌ No'}</div>
              </small>
            </div>
          </div>
          <div className="col-md-6">
            <div className="bg-light rounded p-3">
              <h6 className="fw-bold mb-2" style={{ color: '#648a26' }}>Información del Cliente</h6>
              <small className="text-muted">
                <div><strong>Cliente:</strong> {clientData.cliente}</div>
                <div><strong>Registros:</strong> {clientData.registrosTotales || 'N/A'}</div>
                <div><strong>Tiempo:</strong> {((clientData.tiempoEjecucionMs || 0) / 1000).toFixed(2)}s</div>
              </small>
            </div>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConvergenceModal;
