/**
 * Middleware de validación para la API
 */
import mongoose from 'mongoose';

/**
 * Valida que un ID sea un ObjectId válido de MongoDB
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export function validateObjectId(req, res, next) {
  const id = req.params.id;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
  }
  
  next();
}

/**
 * Valida parámetros de consulta para paginación y ordenamiento
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export function validateQueryParams(req, res, next) {
  // Validar parámetros de paginación
  const page = req.query.page;
  const limit = req.query.limit;
  
  if (page && isNaN(parseInt(page))) {
    return res.status(400).json({
      success: false,
      message: 'Parámetro page debe ser numérico'
    });
  }
  
  if (limit && isNaN(parseInt(limit))) {
    return res.status(400).json({
      success: false,
      message: 'Parámetro limit debe ser numérico'
    });
  }
  
  // Validar ordenamiento
  const validSortFields = [
    'numeroExpediente', 
    'cliente', 
    'metadatos.ultimaActualizacion',
    'datos.fechaCreacion',
    'datos.tipoServicio'
  ];
  
  const sortBy = req.query.sortBy;
  const sortOrder = req.query.sortOrder;
  
  if (sortBy && !validSortFields.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      message: `Campo de ordenamiento inválido. Valores permitidos: ${validSortFields.join(', ')}`
    });
  }
  
  if (sortOrder && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Dirección de ordenamiento inválida. Valores permitidos: asc, desc'
    });
  }
  
  next();
}