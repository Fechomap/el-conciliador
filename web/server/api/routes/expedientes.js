/**
 * Rutas de Expedientes para la API pública en Heroku
 */
import express from 'express';
import Expediente from '../../../../core/db/models/expediente.js';
import { validateObjectId, validateQueryParams } from '../../../../core/api/middlewares/validation.js';

const router = express.Router();

/**
 * @route   GET /api/expedientes/estadisticas
 * @desc    Obtener estadísticas generales de expedientes
 * @access  Public
 */
router.get('/estadisticas', async (req, res, next) => {
  try {
    const cliente = req.query.cliente;
    
    // Filtro base
    const filter = {};
    if (cliente) filter.cliente = cliente.toUpperCase();
    
    // Obtener conteos generales
    const [totalExpedientes, totalFacturados, totalPendientes] = await Promise.all([
      Expediente.countDocuments(filter),
      Expediente.countDocuments({ ...filter, 'metadatos.facturado': true }),
      Expediente.countDocuments({ ...filter, 'metadatos.facturado': false })
    ]);
    
    // Obtener estadísticas por tipo de servicio
    const tiposServicio = await Expediente.aggregate([
      { $match: filter },
      { $group: {
        _id: '$datos.tipoServicio',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);
    
    // Obtener estadísticas por cliente (si no se filtró por cliente)
    let clientesStats = [];
    if (!cliente) {
      clientesStats = await Expediente.aggregate([
        { $group: {
          _id: '$cliente',
          count: { $sum: 1 },
          facturados: {
            $sum: { 
              $cond: [{ $eq: ['$metadatos.facturado', true] }, 1, 0] 
            }
          },
          pendientes: {
            $sum: { 
              $cond: [{ $eq: ['$metadatos.facturado', false] }, 1, 0] 
            }
          }
        }},
        { $sort: { count: -1 } }
      ]);
    }
    
    // Estructurar respuesta
    const estadisticas = {
      totales: {
        expedientes: totalExpedientes,
        facturados: totalFacturados,
        pendientes: totalPendientes
      },
      tiposServicio: tiposServicio.reduce((acc, tipo) => {
        acc[tipo._id || 'SIN_TIPO'] = tipo.count;
        return acc;
      }, {}),
      clientes: clientesStats.map(c => ({
        cliente: c._id,
        total: c.count,
        facturados: c.facturados,
        pendientes: c.pendientes
      }))
    };
    
    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/expedientes/cliente/:cliente
 * @desc    Obtener expedientes por cliente
 * @access  Public
 */
router.get('/cliente/:cliente', async (req, res, next) => {
  try {
    const cliente = req.params.cliente.toUpperCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    
    // Filtro base
    const filter = {
      cliente,
      'metadatos.esDuplicado': { $ne: true }
    };
    
    // Aplicar filtros adicionales
    if (req.query.tipoServicio) {
      filter['datos.tipoServicio'] = req.query.tipoServicio;
    }
    
    if (req.query.facturado !== undefined) {
      filter['metadatos.facturado'] = req.query.facturado === 'true';
    }
    
      // Ejecutar consulta optimizada - Devolver TODOS los campos
      const [expedientes, total] = await Promise.all([
        Expediente.find(filter)
          // Se eliminó el .select() para devolver todos los campos
          .sort({ 'metadatos.ultimaActualizacion': -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      Expediente.countDocuments(filter)
    ]);
    
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
});

/**
 * @route   GET /api/expedientes/numero/:numeroExpediente
 * @desc    Buscar un expediente por su número
 * @access  Public
 */
router.get('/numero/:numeroExpediente', async (req, res, next) => {
  try {
    const numeroExpediente = req.params.numeroExpediente;
    
    // Normalizar formato (eliminar caracteres no numéricos y rellenar con ceros)
    const numeroNormalizado = numeroExpediente
      .replace(/\D/g, '')
      .padStart(8, '0');
    
    // Buscar el expediente principal
    const expediente = await Expediente.findOne({
      numeroExpediente: numeroNormalizado,
      'metadatos.esDuplicado': { $ne: true }
    }).lean();
    
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
});

/**
 * @route   GET /api/expedientes/clientes
 * @desc    Obtener lista única de clientes
 * @access  Public
 */
router.get('/clientes', async (req, res, next) => {
  try {
    // Obtener clientes únicos, excluyendo nulos o vacíos si es necesario
    const clientes = await Expediente.distinct('cliente', { cliente: { $ne: null, $ne: "" } });
    
    // Ordenar alfabéticamente para consistencia
    clientes.sort(); 

    res.json({
      success: true,
      data: clientes
    });
  } catch (error) {
    next(error); // Pasar el error al manejador de errores global
  }
});

/**
 * @route   GET /api/expedientes/:id
 * @desc    Obtener detalles de un expediente
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
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
});

/**
 * @route   GET /api/expedientes
 * @desc    Obtener todos los expedientes (versión pública)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    // Parámetros de paginación y filtros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const cliente = req.query.cliente;
    const tipoServicio = req.query.tipoServicio;
    const facturado = req.query.facturado === 'true';
    
    // Construir filtro básico
    const filter = {
      // Solo mostrar expedientes principales (no duplicados)
      'metadatos.esDuplicado': { $ne: true }
    };
    
    // Aplicar filtros adicionales
    if (cliente) filter.cliente = cliente;
    if (tipoServicio) filter['datos.tipoServicio'] = tipoServicio;
    if (req.query.facturado !== undefined) {
      filter['metadatos.facturado'] = facturado;
    }
    
    // Ejecutar consulta optimizada - Devolver TODOS los campos
    const [expedientes, total] = await Promise.all([
      Expediente.find(filter)
        // Se eliminó el .select() para devolver todos los campos
        .sort({ 'metadatos.ultimaActualizacion': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expediente.countDocuments(filter)
    ]);
    
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
});


export default router;
