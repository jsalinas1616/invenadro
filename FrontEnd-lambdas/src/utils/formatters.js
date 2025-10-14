/**
 * Data formatters - Enterprise grade utilities
 * @module utils/formatters
 */

/**
 * Format number with locale-specific formatting
 * @param {number} num - Number to format
 * @param {string} locale - Locale string (default: 'es-MX')
 * @returns {string} Formatted number
 */
export const formatNumber = (num, locale = 'es-MX') => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat(locale).format(num);
};

/**
 * Format currency with Mexican peso formatting
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, options = {}) => {
  if (amount === null || amount === undefined) return '$0';
  
  const defaultOptions = {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  };
  
  return new Intl.NumberFormat('es-MX', defaultOptions).format(amount);
};

/**
 * Format currency with full precision for financial analysis
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency with decimals
 */
export const formatCurrencyPrecise = (amount) => {
  return formatCurrency(amount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format time duration from milliseconds
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time (e.g., "2m 30s" or "45s")
 */
export const formatTime = (ms) => {
  if (!ms) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

/**
 * Format file size from bytes
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};