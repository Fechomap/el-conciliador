/**
 * Servidor API para El Conciliador
 */
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import expedientesRoutes from './routes/expedientes.js';

// Importar manejadores de errores
const errorHandlers = {
  notFoundHandler: (req, res) => {
    res.status(404).json({
      success: false,
      message: `Ruta no encontrada: ${req.originalUrl}`
    });
  },
  
  errorHandler: (err, req, res, next) => {
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
    
    // Registrar error en console
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
};

// Inicializar router de Express
const router = express.Router();

// Configurar middleware
router.use(helmet()); // Seguridad
router.use(cors()); // CORS
router.use(compression()); // Compresión
router.use(express.json()); // Parsing JSON
router.use(express.urlencoded({ extended: true })); // Parsing URL-encoded
router.use(morgan('dev')); // Logging

// Importar rutas de API
console.log('Registrando ruta /expedientes...');
router.use('/expedientes', expedientesRoutes);


// Ruta de estado
router.get('/status', (req, res) => {
  res.json({
    name: 'El Conciliador API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Manejador para rutas no encontradas
router.use(errorHandlers.notFoundHandler);

// Manejador de errores
router.use(errorHandlers.errorHandler);

// Exportar router
export default router;
