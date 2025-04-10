/**
 * Rutas API para clientes
 */
import express from 'express';
import * as clientesController from '../controllers/clientes.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/clientes
 * @desc    Obtener todos los clientes
 * @access  Public
 */
router.get('/', clientesController.getAllClientes);

/**
 * @route   GET /api/clientes/:id
 * @desc    Obtener un cliente por ID
 * @access  Public
 */
router.get('/:id', validateObjectId, clientesController.getClienteById);

/**
 * @route   GET /api/clientes/codigo/:codigo
 * @desc    Obtener un cliente por código
 * @access  Public
 */
router.get('/codigo/:codigo', clientesController.getClienteByCodigo);

/**
 * @route   GET /api/clientes/:codigo/estadisticas
 * @desc    Obtener estadísticas de expedientes por cliente
 * @access  Public
 */
router.get('/:codigo/estadisticas', clientesController.getEstadisticasCliente);

export default router;