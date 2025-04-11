/**
 * Punto de entrada para la API REST del Conciliador
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { connectToDatabase } from '../db/connection.js';
import { notFoundHandler, errorHandler } from './middleware/error-handlers.js';
import expedientesRoutes from './routes/expedientes.routes.js'; // Importar rutas de expedientes

// Crear aplicación Express
const app = express();

// Middleware básico
app.use(helmet()); // Seguridad
app.use(cors()); // CORS
app.use(express.json()); // Parsing JSON
app.use(express.urlencoded({ extended: true })); // Parsing URL-encoded
app.use(morgan('dev')); // Logging

// Ruta base
app.get('/api', (req, res) => {
  res.json({
    name: 'El Conciliador API',
    version: '1.0.0',
    status: 'running'
  });
});

// Rutas de expedientes
app.use('/api/expedientes', expedientesRoutes); // Middleware para rutas de expedientes

// Middleware de manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Exportar la aplicación
export default app;