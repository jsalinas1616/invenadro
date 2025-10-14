import React from 'react';
import { Modal, Button, Card, Row, Col } from 'react-bootstrap';
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
import { FaChartLine, FaTimes } from 'react-icons/fa';

// Registrar componentes de Chart.js
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

const ConvergenceModal = ({ show, onHide, clientData, result, config }) => {
  console.log('🔍 DEBUG ConvergenceModal - Datos recibidos:');
  console.log('  result:', result);
  console.log('  result.convergenciaData:', result?.convergenciaData);
  console.log('  result.convergenciaConsolidada:', result?.convergenciaConsolidada);
  console.log('  clientData:', clientData);
  console.log('  clientData.montoVentaMostrador:', clientData?.montoVentaMostrador);
  console.log('  config:', config);
  
  // 🔍 DETECTAR SI ES MULTI-CLIENTE Y OBTENER DATOS DE CONVERGENCIA
  const isMultiClient = result?.tipoProcesso === 'MULTI_CLIENT_AGGREGATED' || result?.convergenciaConsolidada;
  
  // Para multi-cliente, usar convergenciaConsolidada[índice del cliente]
  // Para single-cliente, usar convergenciaData
  let convergenciaData = result?.convergenciaData;
  
  if (isMultiClient && result?.convergenciaConsolidada && Array.isArray(result.convergenciaConsolidada)) {
    // Buscar los datos de convergencia del cliente específico
    // Por ahora, usar el primer conjunto de datos (podría mejorarse para buscar por clienteId)
    const clienteIndex = result.resumenPorCliente?.findIndex(c => c.cliente === clientData?.cliente) || 0;
    convergenciaData = result.convergenciaConsolidada[clienteIndex];
    console.log('  📊 Usando convergencia consolidada, índice:', clienteIndex);
  }
  
  console.log('  📊 Convergencia final:', convergenciaData);
  
  if (!result || !convergenciaData || !Array.isArray(convergenciaData)) {
    return (
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaChartLine className="me-2" /> Gráfica de Convergencia</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-center text-muted">No hay datos de convergencia disponibles para este cliente.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  const chartData = {
    labels: convergenciaData.map((_, index) => `Iter ${index + 1}`),
    datasets: [
      {
        label: 'Diferencia vs Objetivo',
        data: convergenciaData.map(iter => iter.diferencia),
        borderColor: '#648a26',
        backgroundColor: 'rgba(100, 138, 38, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: convergenciaData.map(iter => 
          iter.esMejor ? '#28a745' : '#648a26'
        ),
        pointBorderColor: convergenciaData.map(iter => 
          iter.esMejor ? '#28a745' : '#648a26'
        ),
        pointRadius: convergenciaData.map(iter => 
          iter.esMejor ? 8 : 4
        ),
        pointHoverRadius: convergenciaData.map(iter => 
          iter.esMejor ? 10 : 6
        ),
        fill: true,
        tension: 0.4
      },
      {
        label: 'Objetivo (Diferencia = 0)',
        data: new Array(convergenciaData.length).fill(0),
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }
    ]
  };

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
          return tooltipItem.datasetIndex === 0;
        },
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const iter = convergenciaData[index];
            return `Iteración ${index + 1}${iter.esMejor ? ' ⭐ MEJOR' : ''}`;
          },
          label: function(context) {
            const index = context.dataIndex;
            const iter = convergenciaData[index];
            
            // 🔢 CÁLCULO CORRECTO DE DÍAS ALCANZADOS
            // montoVentaMostrador = Venta total del período (ej. $4.9M en 30 días)
            // inversionActual = Inversión calculada en esta iteración (ej. $4.5M)
            // diasDelPeriodo = Días del reporte subido (ej. 30 días)
            // Formula: diasAlcanzados = (inversionActual / montoVentaMostrador) × diasDelPeriodo
            
            const montoVentaMostrador = clientData?.montoVentaMostrador || 0;
            const diasDelPeriodo = config?.diasDeInverionReporteSubido || 30;
            const inversionActual = iter.inversion || 0;
            
            // Calcular días alcanzados con la inversión actual
            const diasAlcanzados = montoVentaMostrador > 0 
              ? (inversionActual / montoVentaMostrador) * diasDelPeriodo 
              : 0;
            
            // Meta de días deseados
            const meta = config?.diasInversionDeseados || 0;
            
            // Diferencia: cuánto nos pasamos o faltamos de la meta
            const diferenciaDias = diasAlcanzados - meta;
            
            return [
              `Factor: ${iter.factor.toFixed(2)}`,
              `Inversión: $${iter.inversion.toLocaleString('es-ES', {minimumFractionDigits: 2})}`,
              `Diferencia: $${iter.diferencia.toLocaleString('es-ES', {minimumFractionDigits: 2})}`,
              `Días Alcanzados: ${diasAlcanzados.toFixed(2)}`,
              `Meta: ${meta} días`,
              `Resultado: ${diferenciaDias > 0 ? '+' : ''}${diferenciaDias.toFixed(2)} días`,
              `Registros > 0: ${(iter.registrosMayorCero || 0).toLocaleString('es-ES')}` // ✅ NUEVO
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
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title><FaChartLine className="me-2" /> Convergencia del Algoritmo - Cliente {clientData?.cliente}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="mb-3">
          <Col>
            <Card className="shadow-sm">
              <Card.Body>
                <h6 className="fw-bold text-corporate mb-3">Resumen del Cliente</h6>
                <p className="small mb-1"><strong>Cliente:</strong> {clientData?.cliente}</p>
                <p className="small mb-1"><strong>Registros:</strong> {clientData?.registros}</p>
                <p className="small mb-1"><strong>Factor Óptimo:</strong> {clientData?.factorOptimo}</p>
                <p className="small mb-1"><strong>Monto Venta Mostrador:</strong> ${clientData?.montoVentaMostrador?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="small mb-1"><strong>Inversión Deseada:</strong> ${clientData?.inversionDeseada?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="small mb-1"><strong>Resultado:</strong> ${clientData?.resultado?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="small mb-0"><strong>Días Deseados:</strong> {config?.diasInversionDeseados || 'N/A'} días</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <div style={{ height: '500px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-1" /> Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConvergenceModal;
