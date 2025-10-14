// Configuration constants - NASA/Facebook style
export const DEFAULT_CONFIG = {
  factorRedondeo: 0.5,
  joroba: 3.5,
  diasInversionDeseados: 26.5,
  diasDeInverionReporteSubido: 30,
  precioMaximo: 3000
};

export const REQUIRED_EXCEL_COLUMNS = [
  'Cliente',
  'Material',
  'Descripción'
];

export const POLLING_INTERVAL = 5000; // 5 seconds

export const PROCESS_STATES = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING', 
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  INITIALIZING: 'INITIALIZING',
  SEPARATING_CLIENTS: 'SEPARATING_CLIENTS',
  PROCESSING_SINGLE: 'PROCESSING_SINGLE',
  PROCESSING_MULTI: 'PROCESSING_MULTI',
  AGGREGATING: 'AGGREGATING',
  COMPLETED_WITH_WARNINGS: 'COMPLETED_WITH_WARNINGS'
};

export const SUPPORTED_FILE_TYPES = {
  EXCEL_NEW: '.xlsx',
  EXCEL_OLD: '.xls'
};

export const COLORS = {
  PRIMARY: '#648a26',
  SECONDARY: '#8ab346', 
  DARK: '#4a6b1d',
  LIGHT: '#6b8f32'
};

export const FILE_SIZE_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024
};