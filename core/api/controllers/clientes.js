/**
 * Controladores para clientes
 */
import { Cliente } from '../../db/models/cliente.js';
import Expediente from '../../db/models/expediente.js';
import { Log } from '../../db/models/log.js';

/**
 * Obtener todos los clientes
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getAllClientes(req, res, next) {
  try {
    // Solo incluir clientes activos por defecto
    const soloActivos = req.query.activos !== 'false';
    const filter = soloActivos ? { activo: true } : {};

    const clientes = await Cliente.find(filter).lean();

    res.json({
      success: true,
      count: clientes.length,
      data: clientes
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener un cliente por ID
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getClienteById(req, res, next) {
  try {
    const cliente = await Cliente.findById(req.params.id).lean();

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener un cliente por código
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getClienteByCodigo(req, res, next) {
  try {
    // Normalizar código a mayúsculas
    const codigo = req.params.codigo.toUpperCase();
    
    const cliente = await Cliente.findOne({ codigo }).lean();

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener estadísticas de expedientes por cliente
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
export async function getEstadisticasCliente(req, res, next) {
  try {
    const codigo = req.params.codigo.toUpperCase();
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findOne({ codigo });
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Obtener total de expedientes
    const totalExpedientes = await Expediente.countDocuments({ cliente: codigo });
    
    // Obtener expedientes por estado
    const expedientesPorEstado = await Expediente.aggregate([
      { $match: { cliente: codigo } },
      { $group: {
        _id: '$metadatos.estadoGeneral',
        count: { $sum: 1 }
      }}
    ]);
    
    // Obtener expedientes por tipo de servicio
    const expedientesPorTipoServicio = await Expediente.aggregate([
      { $match: { cliente: codigo } },
      { $group: {
        _id: '$datos.tipoServicio',
        count: { $sum: 1 }
      }}
    ]);
    
    // Obtener estadísticas de facturas
    const estadisticasFacturas = await Expediente.aggregate([
      { $match: { cliente: codigo } },
      { $project: {
        totalPedidos: { $size: '$pedidos' },
        totalFacturas: { $size: '$facturas' },
        facturado: { $cond: [{ $gt: [{ $size: '$facturas' }, 0] }, 1, 0] },
        pendiente: { $cond: [{ $eq: [{ $size: '$facturas' }, 0] }, 1, 0] }
      }},
      { $group: {
        _id: null,
        totalPedidos: { $sum: '$totalPedidos' },
        totalFacturas: { $sum: '$totalFacturas' },
        expedientesFacturados: { $sum: '$facturado' },
        expedientesPendientes: { $sum: '$pendiente' }
      }}
    ]);
    
    // Obtener datos de actividad reciente (últimos 5 logs)
    const actividadReciente = await Log.find({ cliente: codigo })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
    
    // Estructurar estadísticas
    const estadisticas = {
      cliente: {
        codigo: cliente.codigo,
        nombre: cliente.nombre,
        activo: cliente.activo
      },
      totales: {
        expedientes: totalExpedientes,
        facturados: estadisticasFacturas.length ? estadisticasFacturas[0].expedientesFacturados : 0,
        pendientes: estadisticasFacturas.length ? estadisticasFacturas[0].expedientesPendientes : 0,
        pedidos: estadisticasFacturas.length ? estadisticasFacturas[0].totalPedidos : 0,
        facturas: estadisticasFacturas.length ? estadisticasFacturas[0].totalFacturas : 0
      },
      detalles: {
        porEstado: expedientesPorEstado.reduce((acc, item) => {
          acc[item._id || 'SIN_ESTADO'] = item.count;
          return acc;
        }, {}),
        porTipoServicio: expedientesPorTipoServicio.reduce((acc, item) => {
          acc[item._id || 'SIN_TIPO'] = item.count;
          return acc;
        }, {})
      },
      actividad: actividadReciente
    };
    
    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    next(error);
  }
}