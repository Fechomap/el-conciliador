/**
 * Core API functionality for El Conciliador
 * Este módulo proporciona funcionalidades centrales para la API
 */

// Exportar middlewares
export * from './middlewares/validation.js';

// Constantes de API
export const API_VERSION = '1.0.0';
export const API_NAME = 'El Conciliador API';

// Utilidades para respuestas de API
export const apiResponse = {
  success: (res, data, message = 'Operación exitosa', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },
  
  error: (res, message = 'Error en la operación', statusCode = 500, details = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Exportar por defecto
export default {
  API_VERSION,
  API_NAME,
  apiResponse
};
