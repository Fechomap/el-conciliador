/**
 * Rutas API para expedientes
 */
import express from 'express';
import * as expedientesController from '../controllers/expedientes.js';
import { validateObjectId, validateQueryParams } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/expedientes
 * @desc    Obtener todos los expedientes con paginación y filtros opcionales
 * @access  Public
 */
router.get('/', validateQueryParams, expedientesController.getAllExpedientes);

/**
 * @route   GET /api/expedientes/:id
 * @desc    Obtener un expediente por ID
 * @access  Public
 */
router.get('/:id', validateObjectId, expedientesController.getExpedienteById);

/**
 * @route   GET /api/expedientes/numero/:numeroExpediente
 * @desc    Obtener un expediente por número
 * @access  Public
 */
router.get('/numero/:numeroExpediente', expedientesController.getExpedienteByNumero);

/**
 * @route   GET /api/expedientes/cliente/:cliente
 * @desc    Obtener expedientes por cliente
 * @access  Public
 */
router.get('/cliente/:cliente', validateQueryParams, expedientesController.getExpedientesByCliente);

/**
 * @route   GET /api/expedientes/duplicados
 * @desc    Obtener expedientes duplicados
 * @access  Public
 */
router.get('/duplicados', validateQueryParams, expedientesController.getDuplicados);

/**
 * @route   GET /api/expedientes/pedido/:numeroPedido
 * @desc    Buscar expedientes por número de pedido
 * @access  Public
 */
router.get('/pedido/:numeroPedido', expedientesController.findByNumeroPedido);

/**
 * @route   GET /api/expedientes/factura/:numeroFactura
 * @desc    Buscar expedientes por número de factura
 * @access  Public
 */
router.get('/factura/:numeroFactura', expedientesController.findByNumeroFactura);

export default router;