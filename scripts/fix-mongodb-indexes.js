/**
 * Script para arreglar los índices de MongoDB para El Conciliador
 * 
 * Este script:
 * 1. Se conecta a MongoDB
 * 2. Revisa los índices existentes en la colección expedientes
 * 3. Elimina el índice único de campo único en numeroExpediente
 * 4. Asegura que exista el índice compuesto en {numeroExpediente, cliente}
 * 
 * Uso:
 *   node scripts/fix-mongodb-indexes.js
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
async function conectarMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(chalk.green('✅ Conectado a MongoDB'));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Error al conectar a MongoDB:'), error.message);
    return false;
  }
}

// Arreglar índices
async function arreglarIndices() {
  console.log(chalk.blue('\n=== ARREGLANDO ÍNDICES DE MONGODB ==='));
  
  try {
    // Conectar a MongoDB
    const conectado = await conectarMongoDB();
    if (!conectado) return false;
    
    // Obtener la colección expedientes
    const db = mongoose.connection.db;
    const coleccion = db.collection('expedientes');
    
    // Obtener índices existentes
    console.log(chalk.blue('\nRecuperando índices existentes...'));
    const indices = await coleccion.indexes();
    console.log(chalk.green('Índices actuales:'));
    indices.forEach(indice => {
      console.log(`  - ${indice.name}: ${JSON.stringify(indice.key)}`);
    });
    
    // Buscar el índice problemático de campo único
    const indiceCampoUnico = indices.find(indice => 
      indice.name === 'numeroExpediente_1' && 
      Object.keys(indice.key).length === 1 &&
      indice.unique === true
    );
    
    if (indiceCampoUnico) {
      console.log(chalk.yellow('\nSe encontró un índice único problemático en numeroExpediente'));
      console.log(chalk.blue('Eliminando índice...'));
      
      await coleccion.dropIndex('numeroExpediente_1');
      console.log(chalk.green('✅ Se eliminó con éxito el índice único de campo único'));
    } else {
      console.log(chalk.green('\nNo se encontró índice único problemático en numeroExpediente'));
    }
    
    // Verificar índice compuesto
    const indiceCompuesto = indices.find(indice => 
      indice.key.numeroExpediente === 1 && 
      indice.key.cliente === 1 && 
      indice.unique === true
    );
    
    if (!indiceCompuesto) {
      console.log(chalk.yellow('\nNo se encontró el índice compuesto {numeroExpediente, cliente} o no es único'));
      console.log(chalk.blue('Creando índice único compuesto...'));
      
      await coleccion.createIndex(
        { numeroExpediente: 1, cliente: 1 },
        { unique: true, background: true }
      );
      console.log(chalk.green('✅ Se creó con éxito el índice único compuesto'));
    } else {
      console.log(chalk.green('\nEl índice único compuesto {numeroExpediente, cliente} ya existe'));
    }
    
    // Verificar índices después de los cambios
    console.log(chalk.blue('\nVerificando índices después de los cambios...'));
    const indicesActualizados = await coleccion.indexes();
    console.log(chalk.green('Índices actualizados:'));
    indicesActualizados.forEach(indice => {
      console.log(`  - ${indice.name}: ${JSON.stringify(indice.key)}`);
    });
    
    // Crear índice regular en numeroExpediente (no único) para consultas
    const tieneIndiceNoUnico = indicesActualizados.find(indice => 
      indice.name === 'numeroExpediente_1' && 
      Object.keys(indice.key).length === 1 &&
      !indice.unique
    );
    
    if (!tieneIndiceNoUnico) {
      console.log(chalk.yellow('\nNo se encontró índice no único en numeroExpediente'));
      console.log(chalk.blue('Creando índice no único para consultas...'));
      
      await coleccion.createIndex(
        { numeroExpediente: 1 },
        { background: true }
      );
      console.log(chalk.green('✅ Se creó con éxito un índice no único en numeroExpediente'));
    }
    
    console.log(chalk.green('\n✅ Índices de MongoDB arreglados con éxito'));
    
    // Cerrar conexión MongoDB
    await mongoose.connection.close();
    console.log(chalk.blue('\nConexión a MongoDB cerrada'));
    
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Error al arreglar índices:'), error);
    
    // Cerrar conexión MongoDB
    try {
      await mongoose.connection.close();
      console.log(chalk.blue('\nConexión a MongoDB cerrada'));
    } catch (err) {}
    
    return false;
  }
}

// Ejecutar si se llama directamente
if (process.argv[1].includes('fix-mongodb-indexes.js')) {
  arreglarIndices()
    .then(exito => {
      process.exit(exito ? 0 : 1);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

export { arreglarIndices };