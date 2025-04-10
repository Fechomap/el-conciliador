/**
 * Controladores para expedientes
 */
import mongoose from 'mongoose';
import Expediente from '../../db/models/expediente.js';
import { Log } from '../../db/models/log.js';
import { normalizeExpediente, normalizePedido } from '../../concentrador/utils/normalizers.js';

/**
 * Obtener todos los expedientes con paginación y filtrado
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getAllExpedientes(req, res, next) {
  try {
    // Parámetros de paginación y filtros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const cliente = req.query.cliente;
    const estado = req.query.estado;
    const tipoServicio = req.query.tipoServicio;
    const facturado = req.query.facturado === 'true';
    const sortBy = req.query.sortBy || 'metadatos.ultimaActualizacion';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Construir filtro
    const filter = {};
    
    if (cliente) filter.cliente = cliente;
    if (estado) filter['metadatos.estadoGeneral'] = estado;
    if (tipoServicio) filter['datos.tipoServicio'] = tipoServicio;
    if (req.query.facturado !== undefined) {
      filter['metadatos.facturado'] = facturado;
    }
    
    // Eliminar registros marcados como duplicados del resultado principal
    filter['metadatos.esDuplicado'] = { $ne: true };

    // Ejecutar consulta con filtros y paginación
    const expedientes = await Expediente.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Obtener conteo total para metadata de paginación
    const total = await Expediente.countDocuments(filter);

    // Preparar respuesta
    res.json({
      success: true,
      count: expedientes.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + expedientes.length < total
      },
      data: expedientes
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener un expediente por ID
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getExpedienteById(req, res, next) {
  try {
    const expediente = await Expediente.findById(req.params.id).lean();

    if (!expediente) {
      return res.status(404).json({
        success: false,
        message: 'Expediente no encontrado'
      });
    }

    res.json({
      success: true,
      data: expediente
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener un expediente por número
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getExpedienteByNumero(req, res, next) {
  try {
    // Normalizar el número de expediente
    const numeroExpediente = normalizeExpediente(req.params.numeroExpediente);
    
    // Buscar expediente principal
    const expediente = await Expediente.findOne({ 
      numeroExpediente,
      'metadatos.esDuplicado': { $ne: true } 
    }).lean();

    if (!expediente) {
      return res.status(404).json({
        success: false,
        message: 'Expediente no encontrado'
      });
    }

    // Buscar posibles duplicados
    const duplicados = await Expediente.find({
      numeroExpediente,
      'metadatos.esDuplicado': true
    }).sort({ 'metadatos.ultimaActualizacion': -1 }).lean();

    res.json({
      success: true,
      data: {
        expediente,
        duplicados: duplicados || []
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener expedientes por cliente
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getExpedientesByCliente(req, res, next) {
  try {
    const cliente = req.params.cliente.toUpperCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'metadatos.ultimaActualizacion';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Filtro base por cliente y solo expedientes no duplicados
    const filter = {
      cliente,
      'metadatos.esDuplicado': { $ne: true }
    };

    // Filtros adicionales
    if (req.query.tipoServicio) {
      filter['datos.tipoServicio'] = req.query.tipoServicio;
    }
    
    if (req.query.facturado !== undefined) {
      filter['metadatos.facturado'] = req.query.facturado === 'true';
    }

    // Ejecutar consulta
    const expedientes = await Expediente.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Obtener conteo total
    const total = await Expediente.countDocuments(filter);

    // Registrar actividad en log
    await Log.create({
      timestamp: new Date(),
      operacion: 'consulta_expedientes_cliente',
      cliente,
      detalles: {
        filtros: JSON.stringify(filter),
        resultados: expedientes.length,
        pagina: page,
        limite: limit
      }
    });

    res.json({
      success: true,
      count: expedientes.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + expedientes.length < total
      },
      data: expedientes
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener expedientes marcados como duplicados
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getDuplicados(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const cliente = req.query.cliente;

    // Filtro para duplicados
    const filter = {
      'metadatos.esDuplicado': true
    };

    // Filtrar por cliente si se especifica
    if (cliente) {
      filter.cliente = cliente;
    }

    // Ejecutar consulta
    const duplicados = await Expediente.find(filter)
      .sort({ 'metadatos.ultimaActualizacion': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Expediente.countDocuments(filter);

    res.json({
      success: true,
      count: duplicados.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + duplicados.length < total
      },
      data: duplicados
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Buscar expedientes por número de pedido
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function findByNumeroPedido(req, res, next) {
  try {
    const numeroPedido = normalizePedido(req.params.numeroPedido);
    
    // Buscar expedientes que contengan el número de pedido
    const expedientes = await Expediente.find({
      'pedidos.numeroPedido': numeroPedido
    }).lean();

    if (expedientes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron expedientes con este número de pedido'
      });
    }

    res.json({
      success: true,
      count: expedientes.length,
      data: expedientes
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Buscar expedientes por número de factura
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function findByNumeroFactura(req, res, next) {
  try {
    const numeroFactura = req.params.numeroFactura;
    
    // Buscar expedientes con esta factura
    const expedientes = await Expediente.find({
      'facturas.numeroFactura': numeroFactura
    }).lean();

    // También buscar expedientes donde los pedidos tengan esta factura
    const expedientesPorPedido = await Expediente.find({
      'pedidos.factura': numeroFactura
    }).lean();

    // Combinar resultados y eliminar duplicados
    const todosExpedientes = [...expedientes];
    
    for (const exp of expedientesPorPedido) {
      if (!todosExpedientes.some(e => e._id.toString() === exp._id.toString())) {
        todosExpedientes.push(exp);
      }
    }

    if (todosExpedientes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron expedientes con este número de factura'
      });
    }

    res.json({
      success: true,
      count: todosExpedientes.length,
      data: todosExpedientes
    });
  } catch (error) {
    next(error);
  }
}