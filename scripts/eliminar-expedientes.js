#!/usr/bin/env node
/**
 * Script para eliminar la colección de expedientes en MongoDB
 * 
 * Este script:
 * 1. Se conecta a MongoDB
 * 2. Elimina la colección de expedientes
 * 3. Proporciona opciones de seguridad y backup
 * 
 * ADVERTENCIA: Este script elimina datos permanentemente.
 * Asegúrate de tener un backup antes de ejecutarlo.
 * 
 * Uso:
 *   node scripts/eliminar-expedientes.js [--backup] [--force]
 * 
 * Opciones:
 *   --backup: Realiza un backup antes de eliminar la colección
 *   --force: Omite la confirmación manual
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Configuración para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Analizar argumentos
const args = process.argv.slice(2);
const shouldBackup = args.includes('--backup');
const forceDelete = args.includes('--force');

// Crear interfaz para entrada de usuario
const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Conecta a MongoDB
 */
async function conectarMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conexión a MongoDB establecida');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    return false;
  }
}

/**
 * Realiza un backup de la colección de expedientes
 */
async function realizarBackup() {
  console.log('📦 Realizando backup de la colección de expedientes...');
  
  try {
    // Crear carpeta de backups si no existe
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Nombre del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `expedientes_backup_${timestamp}.json`);
    
    // Obtener modelo de expediente
    const Expediente = mongoose.model('Expediente', new mongoose.Schema({}, { 
      strict: false,
      collection: 'expedientes'
    }));
    
    // Obtener todos los documentos
    const expedientes = await Expediente.find({}).lean();
    
    // Guardar en archivo JSON
    fs.writeFileSync(backupFile, JSON.stringify(expedientes, null, 2));
    
    console.log(`✅ Backup completado: ${expedientes.length} expedientes guardados en ${backupFile}`);
    return true;
  } catch (error) {
    console.error('❌ Error realizando backup:', error.message);
    return false;
  }
}

/**
 * Solicita confirmación antes de eliminar
 */
function solicitarConfirmacion() {
  return new Promise((resolve) => {
    console.log('\n⚠️ ADVERTENCIA ⚠️');
    console.log('Estás a punto de ELIMINAR PERMANENTEMENTE todos los expedientes en MongoDB.');
    console.log('Esta acción NO SE PUEDE DESHACER.');
    
    readline.question('\n¿Estás seguro que deseas continuar? (escribe "ELIMINAR" para confirmar): ', (answer) => {
      if (answer === 'ELIMINAR') {
        resolve(true);
      } else {
        console.log('Operación cancelada.');
        resolve(false);
      }
    });
  });
}

/**
 * Elimina la colección de expedientes
 */
async function eliminarExpedientes() {
  console.log('🗑️ Eliminando colección de expedientes...');
  
  try {
    // Estadísticas antes de eliminar
    const colecciones = await mongoose.connection.db.listCollections().toArray();
    const existeColeccion = colecciones.some(col => col.name === 'expedientes');
    
    if (!existeColeccion) {
      console.log('ℹ️ La colección de expedientes no existe. No se requiere eliminar.');
      return true;
    }
    
    // Contar documentos antes de eliminar
    const countBefore = await mongoose.connection.db.collection('expedientes').countDocuments();
    console.log(`ℹ️ La colección contiene ${countBefore} documentos.`);
    
    // Eliminar colección
    await mongoose.connection.db.collection('expedientes').drop();
    
    // Verificar eliminación
    const coleccionesDespues = await mongoose.connection.db.listCollections().toArray();
    const coleccionEliminada = !coleccionesDespues.some(col => col.name === 'expedientes');
    
    if (coleccionEliminada) {
      console.log('✅ Colección de expedientes eliminada correctamente');
      
      // Registrar actividad en archivo de log
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, 'db_operations.log');
      const logEntry = `[${new Date().toISOString()}] ELIMINACIÓN: Colección 'expedientes' eliminada (${countBefore} documentos)\n`;
      fs.appendFileSync(logFile, logEntry);
      
      return true;
    } else {
      console.error('❌ No se pudo verificar la eliminación de la colección');
      return false;
    }
  } catch (error) {
    console.error('❌ Error eliminando colección:', error.message);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('=== ELIMINACIÓN DE COLECCIÓN DE EXPEDIENTES ===\n');
  
  // Conectar a MongoDB
  const conectado = await conectarMongoDB();
  if (!conectado) {
    process.exit(1);
  }
  
  try {
    // Realizar backup si se solicitó
    if (shouldBackup) {
      const backupRealizado = await realizarBackup();
      if (!backupRealizado && !forceDelete) {
        console.error('❌ No se pudo completar el backup. Operación cancelada por seguridad.');
        console.log('   Usa --force para eliminar sin backup exitoso.');
        process.exit(1);
      }
    } else {
      console.log('⚠️ No se realizará backup antes de eliminar.');
      console.log('   Usa --backup para crear un backup automáticamente.');
    }
    
    // Solicitar confirmación si no se forzó la eliminación
    let confirmar = forceDelete;
    if (!confirmar) {
      confirmar = await solicitarConfirmacion();
    }
    
    // Proceder con la eliminación si se confirmó
    if (confirmar) {
      const eliminado = await eliminarExpedientes();
      
      if (eliminado) {
        console.log('\n✅ Operación completada correctamente');
      } else {
        console.error('\n❌ No se pudo completar la operación');
      }
    } else {
      console.log('\nOperación cancelada por el usuario');
    }
  } catch (error) {
    console.error('\n❌ Error durante la operación:', error);
  } finally {
    // Cerrar conexión y readline
    await mongoose.connection.close();
    readline.close();
    console.log('\nConexión a MongoDB cerrada');
  }
}

// Ejecutar script
main().catch(console.error);