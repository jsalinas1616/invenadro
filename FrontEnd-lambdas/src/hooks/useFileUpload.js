/**
 * File upload hook - Meta/Facebook style
 * Handles file selection, validation, and upload state
 */

import { useState, useCallback } from 'react';
import { validateFile, validateExcelColumns } from '../utils/validators';

/**
 * Hook for managing file upload functionality
 * @returns {Object} File upload state and handlers
 */
export const useFileUpload = () => {
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Handle file selection with validation
   * @param {File} selectedFile - Selected file
   */
  const handleFileSelect = useCallback(async (selectedFile) => {
    setValidationError(null);
    
    // Basic file validation
    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.isValid) {
      setValidationError(fileValidation.error);
      return false;
    }

    setIsValidating(true);
    
    try {
      // Excel column validation
      const excelValidation = await validateExcelColumns(selectedFile);
      
      if (!excelValidation.isValid) {
        setValidationError(excelValidation.error);
        setIsValidating(false);
        return false;
      }

      // Success - file is valid
      setFile(selectedFile);
      setValidationError(null);
      setIsValidating(false);
      
      console.log('✅ Archivo validado exitosamente:', {
        name: selectedFile.name,
        size: selectedFile.size,
        headers: excelValidation.data.headers,
        rows: excelValidation.data.totalRows
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Error durante validación:', error);
      setValidationError('Error inesperado durante la validación');
      setIsValidating(false);
      return false;
    }
  }, []);

  /**
   * Reset file upload state
   */
  const resetFile = useCallback(() => {
    setFile(null);
    setValidationError(null);
    setUploadProgress(0);
    setIsValidating(false);
  }, []);

  /**
   * Update upload progress
   * @param {number} progress - Progress percentage (0-100)
   */
  const updateProgress = useCallback((progress) => {
    setUploadProgress(Math.max(0, Math.min(100, progress)));
  }, []);

  return {
    // State
    file,
    isValidating,
    validationError,
    uploadProgress,
    
    // Actions
    handleFileSelect,
    resetFile,
    updateProgress,
    
    // Computed
    hasFile: !!file,
    isValid: file && !validationError,
    fileName: file?.name,
    fileSize: file?.size
  };
};