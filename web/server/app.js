/**
 * Servidor principal para El Conciliador
 */
import express from 'express';
import path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { connectToDatabase } from '../../core/db/connection.js';
import expedientesRoutes from './api/routes/expedientes.js';

// Configurar variables de entorno
dotenv.config();

// Configurar __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
connectToDatabase();

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas API
app.use('/api/expedientes', expedientesRoutes);

// Ruta de estado
app.get('/api/status', (req, res) => {
  res.json({
    name: 'El Conciliador API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Ruta para cualquier solicitud que no coincida con las rutas anteriores
app.get('*', (req, res) => {
  // Mostrar una página simple
  res.send(`
    <html>
      <head>
        <title>El Conciliador - API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          .endpoint { margin-bottom: 10px; }
          .method { display: inline-block; width: 60px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>El Conciliador - API</h1>
        <p>La API está funcionando correctamente.</p>
        
        <h2>Endpoints disponibles:</h2>
        <div class="endpoint"><span class="method">GET</span> /api/status</div>
        <div class="endpoint"><span class="method">GET</span> /api/expedientes</div>
        <div class="endpoint"><span class="method">GET</span> /api/expedientes/:id</div>
        <div class="endpoint"><span class="method">GET</span> /api/expedientes/numero/:numeroExpediente</div>
        <div class="endpoint"><span class="method">GET</span> /api/expedientes/cliente/:cliente</div>
        <div class="endpoint"><span class="method">GET</span> /api/expedientes/estadisticas</div>
      </body>
    </html>
  `);
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api/status`);
});

export default app;