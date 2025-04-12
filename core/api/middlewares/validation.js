/**
 * Middleware de validación para la API
 */
import mongoose from 'mongoose';

/**
 * Valida que un ID sea un ObjectId válido de MongoDB
 * @param {string} id - ID a validar
 * @returns {boolean} - true si es válido, false si no
 */
export function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Middleware para validar parámetros de consulta
 * @param {Object} schema - Esquema de validación
 * @returns {Function} - Middleware de Express
 */
export function validateQueryParams(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos',
        error: error.details[0].message
      });
    }
    next();
  };
}
