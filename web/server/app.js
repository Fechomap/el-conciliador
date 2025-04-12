/**
 * Servidor principal para El Conciliador
 */
import express from 'express';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { connectToDatabase } from '../../core/db/connection.js';
import apiRouter from './api/index.js'; // Importar el router principal de la API

// Configurar variables de entorno
dotenv.config();

// Configurar __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '../..');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
connectToDatabase();

// Habilitar CORS para permitir peticiones desde el frontend
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Usar el router principal de la API
console.log('Registrando rutas de API...');
app.use('/', apiRouter);
console.log('Rutas registradas.');

// Imprimir todas las rutas registradas
console.log('Rutas disponibles:');
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.stack[0].method.toUpperCase() + ' ' + r.route.path);
  } else if (r.name === 'router') {
    r.handle.stack.forEach(function(layer) {
      if (layer.route) {
        console.log(layer.route.stack[0].method.toUpperCase() + ' ' + layer.route.path);
      }
    });
  }
});

// Servir archivos estáticos del frontend en producción
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientPath));
  
  // Enviar el index.html para todas las rutas no-API
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientPath, 'index.html'));
    }
  });
}

// En desarrollo, mostrar una página simple
app.get('/', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
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
          <div class="endpoint"><span class="method">POST</span> /api/upload/process</div>
        </body>
      </html>
    `);
  }
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
