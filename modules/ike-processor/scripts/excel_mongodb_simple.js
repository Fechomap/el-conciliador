/**
 * Ruta: modules/ike-processor/scripts/excel_mongodb_simple.js
 * 
 * Versión simplificada del script de sincronización Excel-MongoDB
 * 
 * Este script proporciona funcionalidades básicas para importar
 * datos de Excel a MongoDB sin depender de muchas dependencias externas.
 */

import * as dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { connectToDatabase, mongoose } from '../../../core/db/connection.js';
import Expediente from '../../../core/db/models/expediente.js';
import { Log } from '../../../core/db/models/log.js';

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

/**
 * Ejecuta un script Python de manera asíncrona
 * @param {String} scriptPath - Ruta al script Python
 * @param {Array} args - Argumentos para el script
 * @returns {Promise<Object>} - Resultado de la ejecución
 */
async function runPythonScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    // Verificar que existe el script
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Script no encontrado: ${scriptPath}`));
    }
    
    console.log(`Ejecutando script Python: ${scriptPath}`);
    console.log(`Argumentos: ${args.join(' ')}`);
    
    // Configurar proceso Python
    const pythonProcess = spawn('python3', [scriptPath, ...args]);
    
    let stdoutData = '';
    let stderrData = '';
    
    // Capturar salida estándar
    pythonProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      stdoutData += dataStr;
      console.log(dataStr);
    });
    
    // Capturar errores
    pythonProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      stderrData += dataStr;
      console.error(dataStr);
    });
    
    // Manejar finalización
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          stdout: stdoutData,
          stderr: stderrData
        });
      } else {
        reject(new Error(`Script Python terminó con código de error: ${code}\n${stderrData}`));
      }
    });
    
    // Manejar errores del proceso
    pythonProcess.on('error', (err) => {
      reject(new Error(`Error al ejecutar script Python: ${err.message}`));
    });
  });
}

/**
 * Importa datos desde Excel a MongoDB
 * @param {String} excelPath - Ruta al archivo Excel
 */
async function importExcelToMongoDB(excelPath) {
  console.log('=== IMPORTANDO EXCEL A MONGODB (VERSIÓN SIMPLE) ===');
  
  try {
    // Verificar archivo
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Archivo Excel no encontrado: ${excelPath}`);
    }
    
    console.log(`Procesando archivo: ${excelPath}`);
    
    // Ejecutar script Python de exportación
    const scriptPath = path.join(__dirname, 'export_mongodb.py');
    
    // Argumentos para el script
    const args = [excelPath];
    
    // Si hay URI y nombre de base de datos en variables de entorno, añadirlos
    if (process.env.MONGODB_URI) {
      args.push('--uri', process.env.MONGODB_URI);
    }
    
    if (process.env.MONGODB_DB_NAME) {
      args.push('--db', process.env.MONGODB_DB_NAME);
    }
    
    // Archivo de log
    const logFile = path.join(OUTPUT_DIR, 'logs', `mongodb_export_${Date.now()}.log`);
    args.push('--log_file', logFile);
    
    // Crear directorio para logs si no existe
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    
    // Ejecutar script
    await runPythonScript(scriptPath, args);
    
    console.log(`✅ Exportación completada. Log generado en: ${logFile}`);
    
    return {
      success: true,
      logFile
    };
  } catch (error) {
    console.error(`❌ Error en la importación: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica la conexión a MongoDB y muestra estadísticas básicas
 */
async function verifyMongoDBConnection() {
  console.log('=== VERIFICACIÓN DE CONEXIÓN MONGODB ===');
  
  try {
    // Conectar a MongoDB
    await connectToDatabase();
    console.log('✅ Conexión a MongoDB establecida');
    
    // Obtener estadísticas básicas
    const expedientesCount = await Expediente.countDocuments();
    console.log(`📊 Total de expedientes en MongoDB: ${expedientesCount}`);
    
    // Estadísticas por cliente
    const clientesStats = await Expediente.aggregate([
      { $group: {
        _id: '$cliente',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);
    
    console.log('📊 Expedientes por cliente:');
    clientesStats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count} expedientes`);
    });
    
    // Estadísticas por estado
    const estadosStats = await Expediente.aggregate([
      { $group: {
        _id: '$metadatos.estadoGeneral',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);
    
    console.log('📊 Expedientes por estado:');
    estadosStats.forEach(stat => {
      console.log(`   - ${stat._id || 'Sin estado'}: ${stat.count} expedientes`);
    });
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada');
    
    return {
      success: true,
      estadisticas: {
        total: expedientesCount,
        clientes: clientesStats,
        estados: estadosStats
      }
    };
  } catch (error) {
    console.error(`❌ Error al verificar conexión: ${error.message}`);
    
    // Intentar cerrar conexión
    try {
      await mongoose.connection.close();
    } catch (err) {}
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Exportar funciones
export { 
  importExcelToMongoDB,
  verifyMongoDBConnection,
  runPythonScript
};

// Si se ejecuta directamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const filePath = process.argv[3];
  
  switch (command) {
    case 'import':
      if (!filePath) {
        console.error('❌ Debe proporcionar la ruta al archivo Excel');
        console.log('Uso: node excel_mongodb_simple.js import <ruta_excel>');
        process.exit(1);
      }
      
      importExcelToMongoDB(filePath)
        .then(() => process.exit(0))
        .catch(error => {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        });
      break;
      
    case 'verify':
      verifyMongoDBConnection()
        .then(() => process.exit(0))
        .catch(error => {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
Sincronización Excel-MongoDB (Versión Simple)

Uso:
  node excel_mongodb_simple.js <comando> [argumentos]

Comandos:
  import <ruta_excel>   Importa datos desde Excel a MongoDB
  verify                Verifica la conexión a MongoDB y muestra estadísticas

Ejemplos:
  node excel_mongodb_simple.js import output/data.xlsx
  node excel_mongodb_simple.js verify
      `);
      process.exit(0);
  }
}