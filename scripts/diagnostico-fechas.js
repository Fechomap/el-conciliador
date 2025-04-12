/**
 * Script para diagnosticar problemas de fechas en MongoDB
 * 
 * Este script:
 * 1. Se conecta a MongoDB
 * 2. Verifica los campos de fechas en los expedientes
 * 3. Genera un reporte de diagnóstico
 * 
 * Guardar como scripts/diagnostico-fechas.js
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import path from 'path';

// Configuración para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

/**
 * Conecta a MongoDB
 */
async function conectarMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(chalk.green('✅ Conexión a MongoDB establecida'));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Error conectando a MongoDB:'), error.message);
    return false;
  }
}

/**
 * Diagnostica los campos de fechas en los expedientes
 */
async function diagnosticarFechas() {
  // Crear modelo temporal para expedientes
  const expedienteSchema = new mongoose.Schema({}, { 
    strict: false,
    collection: 'expedientes'
  });
  
  const Expediente = mongoose.model('Expediente', expedienteSchema);
  
  // Estadísticas
  const stats = {
    total: 0,
    conFechaCreacion: 0,
    conFechaRegistro: 0,
    sinFechaCreacion: 0,
    sinFechaRegistro: 0,
    conAmbasFechas: 0,
    sinNingunaFecha: 0,
    expedientesSinFechas: []
  };
  
  console.log(chalk.blue('\n--- INICIANDO DIAGNÓSTICO DE FECHAS ---'));
  
  try {
    // Contar total de expedientes
    stats.total = await Expediente.countDocuments();
    console.log(chalk.blue(`Total de expedientes: ${stats.total}`));
    
    // Contar expedientes con/sin cada tipo de fecha
    stats.conFechaCreacion = await Expediente.countDocuments({
      'datos.fechaCreacion': { $exists: true, $ne: null }
    });
    
    stats.conFechaRegistro = await Expediente.countDocuments({
      'datosConcentrado.fechaRegistro': { $exists: true, $ne: null }
    });
    
    stats.sinFechaCreacion = stats.total - stats.conFechaCreacion;
    stats.sinFechaRegistro = stats.total - stats.conFechaRegistro;
    
    stats.conAmbasFechas = await Expediente.countDocuments({
      'datos.fechaCreacion': { $exists: true, $ne: null },
      'datosConcentrado.fechaRegistro': { $exists: true, $ne: null }
    });
    
    stats.sinNingunaFecha = await Expediente.countDocuments({
      $or: [
        { 'datos.fechaCreacion': { $exists: false } },
        { 'datos.fechaCreacion': null }
      ],
      $or: [
        { 'datosConcentrado.fechaRegistro': { $exists: false } },
        { 'datosConcentrado.fechaRegistro': null }
      ]
    });
    
    // Obtener detalles de expedientes sin fechas
    const expedientesSinFechas = await Expediente.find({
      $or: [
        { 'datos.fechaCreacion': { $exists: false } },
        { 'datos.fechaCreacion': null },
        { 'datosConcentrado.fechaRegistro': { $exists: false } },
        { 'datosConcentrado.fechaRegistro': null }
      ]
    }).select('numeroExpediente cliente').limit(10).lean();
    
    stats.expedientesSinFechas = expedientesSinFechas;
    
    // Verificar si el campo fechaRegistro está presente en datosConcentrado
    const muestraExpedientes = await Expediente.find().limit(5).lean();
    
    console.log(chalk.blue('\n--- MUESTRA DE ESTRUCTURA DE DATOS ---'));
    muestraExpedientes.forEach(exp => {
      console.log(chalk.yellow(`\nExpediente: ${exp.numeroExpediente}`));
      console.log('datos.fechaCreacion:', exp.datos?.fechaCreacion);
      console.log('datosConcentrado.fechaRegistro:', exp.datosConcentrado?.fechaRegistro);
      
      if (exp.datosConcentrado) {
        console.log('Campos en datosConcentrado:', Object.keys(exp.datosConcentrado));
      } else {
        console.log('No existe el objeto datosConcentrado');
      }
    });
    
    // Imprimir resultados
    console.log(chalk.blue('\n--- RESULTADOS DEL DIAGNÓSTICO ---'));
    console.log(chalk.green(`Expedientes con datos.fechaCreacion: ${stats.conFechaCreacion} (${Math.round(stats.conFechaCreacion/stats.total*100)}%)`));
    console.log(chalk.green(`Expedientes con datosConcentrado.fechaRegistro: ${stats.conFechaRegistro} (${Math.round(stats.conFechaRegistro/stats.total*100)}%)`));
    console.log(chalk.green(`Expedientes con ambas fechas: ${stats.conAmbasFechas} (${Math.round(stats.conAmbasFechas/stats.total*100)}%)`));
    console.log(chalk.red(`Expedientes sin datos.fechaCreacion: ${stats.sinFechaCreacion} (${Math.round(stats.sinFechaCreacion/stats.total*100)}%)`));
    console.log(chalk.red(`Expedientes sin datosConcentrado.fechaRegistro: ${stats.sinFechaRegistro} (${Math.round(stats.sinFechaRegistro/stats.total*100)}%)`));
    console.log(chalk.red(`Expedientes sin ninguna fecha: ${stats.sinNingunaFecha} (${Math.round(stats.sinNingunaFecha/stats.total*100)}%)`));
    
    if (stats.expedientesSinFechas.length > 0) {
      console.log(chalk.yellow('\nEjemplos de expedientes sin fechas:'));
      stats.expedientesSinFechas.forEach(exp => {
        console.log(`- Expediente: ${exp.numeroExpediente}, Cliente: ${exp.cliente}`);
      });
    }
    
    // Verificar específicamente la estructura del campo fechaRegistro
    console.log(chalk.blue('\n--- VERIFICANDO NOMBRES DE CAMPOS EN DATOSCONCENTRADO ---'));
    
    // Contar expedientes por cada nombre posible de campo de fecha
    const camposPosibles = ['fechaRegistro', 'fecha', 'fechaCreacion', 'fechaAsignacion', 'C', 'fechaRegistro'];
    
    for (const campo of camposPosibles) {
      const count = await Expediente.countDocuments({
        [`datosConcentrado.${campo}`]: { $exists: true, $ne: null }
      });
      
      console.log(`Expedientes con datosConcentrado.${campo}: ${count} (${Math.round(count/stats.total*100)}%)`);
    }
    
    // Buscar campos en datosConcentrado que puedan contener la fecha
    const expedienteMuestra = await Expediente.findOne().lean();
    if (expedienteMuestra && expedienteMuestra.datosConcentrado) {
      console.log(chalk.yellow('\nCampos en datosConcentrado del primer expediente:'));
      Object.entries(expedienteMuestra.datosConcentrado).forEach(([key, value]) => {
        if (value instanceof Date || (typeof value === 'string' && !isNaN(new Date(value)))) {
          console.log(`- ${key}: ${value} (parece ser una fecha)`);
        } else if (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date')) {
          console.log(`- ${key}: ${value} (posible fecha por nombre)`);
        }
      });
    }
    
  } catch (error) {
    console.error(chalk.red('\nError durante el diagnóstico:'), error);
  }
  
  console.log(chalk.blue('\n--- DIAGNÓSTICO FINALIZADO ---'));
  
  return stats;
}

// Ejecutar diagnóstico
async function main() {
  try {
    // Conectar a MongoDB
    const conectado = await conectarMongoDB();
    if (!conectado) process.exit(1);
    
    // Ejecutar diagnóstico
    await diagnosticarFechas();
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log(chalk.blue('\nConexión a MongoDB cerrada'));
  } catch (error) {
    console.error(chalk.red('\nError en el script:'), error);
  }
}

main();