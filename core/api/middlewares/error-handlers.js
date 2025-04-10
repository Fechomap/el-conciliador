/**
 * Manejadores de errores para la API
 */

/**
 * Middleware para manejar rutas no encontradas
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
}

/**
 * Middleware para manejar errores generales
 * @param {Error} err - Error capturado
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export function errorHandler(err, req, res, next) {
  // Determinar código de estado HTTP
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let errorMessage = err.message || 'Error interno del servidor';
  let errorDetails = process.env.NODE_ENV === 'production' ? {} : err.stack;
  
  // Manejar errores específicos de MongoDB
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    errorMessage = 'Formato de ID inválido';
  } else if (err.code === 11000) {
    statusCode = 400;
    errorMessage = 'Registro duplicado encontrado';
    errorDetails = err.keyValue;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = Object.values(err.errors).map(val => val.message).join(', ');
  }
  
  // Registrar error en logs
  console.error(`Error: ${statusCode} - ${errorMessage}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  
  // Enviar respuesta de error
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    details: errorDetails,
    timestamp: new Date().toISOString()
  });
}

/**
 * Middleware para manejar errores de autorización
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export function unauthorizedHandler(req, res, next) {
  res.status(401).json({
    success: false,
    message: 'No autorizado para acceder a este recurso'
  });
}

/**
 * Middleware para manejar límites de tasa (rate limiting)
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export function rateLimitHandler(req, res, next) {
  res.status(429).json({
    success: false,
    message: 'Demasiadas solicitudes, por favor intente más tarde'
  });
}