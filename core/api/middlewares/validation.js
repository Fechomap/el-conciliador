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

/**
 * Valida estructura de un expediente para creación/actualización
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export function validateExpediente(req, res, next) {
  const { numeroExpediente, cliente } = req.body;
  
  // Validar campos obligatorios
  if (!numeroExpediente) {
    return res.status(400).json({
      success: false,
      message: 'El número de expediente es obligatorio'
    });
  }
  
  if (!cliente) {
    return res.status(400).json({
      success: false,
      message: 'El cliente es obligatorio'
    });
  }
  
  // Validar número de expediente (8 dígitos numéricos)
  const expRegex = /^\d{8}$/;
  const numeroNormalizado = numeroExpediente.replace(/[^0-9]/g, '');
  
  if (!expRegex.test(numeroNormalizado)) {
    return res.status(400).json({
      success: false,
      message: 'El número de expediente debe tener 8 dígitos numéricos'
    });
  }
  
  // Continuar con la validación de pedidos si existen
  if (req.body.pedidos && Array.isArray(req.body.pedidos)) {
    for (const pedido of req.body.pedidos) {
      if (pedido.numeroPedido) {
        const pedidoRegex = /^\d{10}$/;
        const pedidoNormalizado = pedido.numeroPedido.replace(/[^0-9]/g, '');
        
        if (!pedidoRegex.test(pedidoNormalizado)) {
          return res.status(400).json({
            success: false,
            message: 'Los números de pedido deben tener 10 dígitos numéricos'
          });
        }
      }
    }
  }
  
  next();
}