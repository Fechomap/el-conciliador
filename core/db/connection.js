/**
 * Configuración de conexión a MongoDB
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

// Opciones de conexión
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// Función para conectar a MongoDB
export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log(`Conectado a MongoDB: ${MONGODB_DB_NAME}`);
    return mongoose.connection;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Manejar errores de conexión
mongoose.connection.on('error', err => {
  console.error(`Error de conexión a MongoDB: ${err}`);
});

// Manejar desconexiones
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado');
});

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Conexión a MongoDB cerrada');
  process.exit(0);
});

export { mongoose };