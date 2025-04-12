#!/usr/bin/env node
/**
 * Script para diagnosticar por qué algunos expedientes aparecen como pendientes
 */

import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectToDatabase } from '../core/db/connection.js';
import chalk from 'chalk';

// Cargar variables de entorno
dotenv.config();

async function main() {
  console.log(chalk.blue('=== DIAGNÓSTICO DE EXPEDIENTES PENDIENTES ==='));
  
  try {
    // Conectar a MongoDB
    await connectToDatabase();
    console.log(chalk.green('✅ Conexión a MongoDB establecida'));
    
    // Definir esquema de expediente para consultas
    const expedienteSchema = new mongoose.Schema({
      numeroExpediente: String,
      cliente: String,
      metadatos: {
        facturado: Boolean,
        estadoGeneral: String
      },
      datos: {
        fechaCreacion: Date,
        tipoServicio: String
      },
      facturas: [mongoose.Schema.Types.Mixed],
      pedidos: [mongoose.Schema.Types.Mixed]
    }, { 
      collection: 'expedientes',
      strict: false
    });
    
    const Expediente = mongoose.model('Expediente', expedienteSchema);
    
    // 1. Total de expedientes
    const totalExpedientes = await Expediente.countDocuments();
    console.log(chalk.blue(`\nTotal de expedientes en MongoDB: ${totalExpedientes}`));
    
    // 2. Distribución por estado general
    console.log(chalk.blue('\n=== DISTRIBUCIÓN POR ESTADO GENERAL ==='));
    const expedientesPorEstado = await Expediente.aggregate([
      {
        $group: {
          _id: '$metadatos.estadoGeneral',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    expedientesPorEstado.forEach(estado => {
      console.log(`${estado._id || 'NULL/UNDEFINED'}: ${estado.count}`);
    });
    
    // 3. Verificar expedientes con estado PENDIENTE
    const expedientesPendientes = await Expediente.countDocuments({
      'metadatos.estadoGeneral': 'PENDIENTE'
    });
    
    console.log(chalk.blue('\n=== DETALLES DE EXPEDIENTES PENDIENTES ==='));
    console.log(`Total expedientes con estado PENDIENTE: ${expedientesPendientes}`);
    
    // 4. Analizar un ejemplo de expediente pendiente
    const ejemploPendiente = await Expediente.findOne({
      'metadatos.estadoGeneral': 'PENDIENTE'
    });
    
    if (ejemploPendiente) {
      console.log(chalk.blue('\n=== EJEMPLO DE EXPEDIENTE PENDIENTE ==='));
      console.log(`Número de expediente: ${ejemploPendiente.numeroExpediente}`);
      console.log(`Cliente: ${ejemploPendiente.cliente}`);
      console.log(`Estado general: ${ejemploPendiente.metadatos?.estadoGeneral}`);
      console.log(`Facturado: ${ejemploPendiente.metadatos?.facturado}`);
      console.log(`Tiene facturas: ${ejemploPendiente.facturas?.length > 0}`);
      console.log(`Tiene pedidos: ${ejemploPendiente.pedidos?.length > 0}`);
    }
    
    // 5. Búsqueda de expedientes sin estado definido
    const expedientesSinEstado = await Expediente.countDocuments({
      $or: [
        { 'metadatos.estadoGeneral': { $exists: false } },
        { 'metadatos.estadoGeneral': null },
        { 'metadatos': { $exists: false } }
      ]
    });
    
    console.log(chalk.blue('\n=== EXPEDIENTES SIN ESTADO DEFINIDO ==='));
    console.log(`Total expedientes sin estado general definido: ${expedientesSinEstado}`);
    
    // 6. Analizar la distribución de clientes
    console.log(chalk.blue('\n=== DISTRIBUCIÓN POR CLIENTE ==='));
    const expedientesPorCliente = await Expediente.aggregate([
      {
        $group: {
          _id: '$cliente',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    expedientesPorCliente.forEach(cliente => {
      console.log(`${cliente._id || 'NULL/UNDEFINED'}: ${cliente.count}`);
    });
    
    // 7. Revisar el conteo del dashboard
    console.log(chalk.blue('\n=== CALCULANDO TOTALES COMO LO HARÍA EL DASHBOARD ==='));
    
    // Expedientes facturados según dashboard (al menos una factura o pedido facturado)
    const expedientesFacturadosDashboard = await Expediente.countDocuments({
      $or: [
        { 'metadatos.facturado': true },
        { 'facturas.0': { $exists: true } },
        { 'pedidos': { $elemMatch: { 'estatus': { $in: ['FACTURADO', 'FACTURADO POR EXPEDIENTE'] } } } }
      ]
    });
    
    console.log(`Expedientes considerados "facturados" por el dashboard: ${expedientesFacturadosDashboard}`);
    
    // Expedientes pendientes según la lógica que podría estar usando el dashboard
    const expedientesPendientesDashboard = await Expediente.countDocuments({
      'metadatos.estadoGeneral': 'PENDIENTE',
      'metadatos.facturado': { $ne: true },
      'facturas.0': { $exists: false }
    });
    
    console.log(`Expedientes "pendientes" (estado PENDIENTE y sin facturar): ${expedientesPendientesDashboard}`);
    
    // 8. Búsqueda específica de expedientes que podrían estar clasificados como pendientes
    console.log(chalk.blue('\n=== BUSCANDO POSIBLES EXPEDIENTES PENDIENTES ==='));
    
    // Hipótesis 1: Expedientes con estado PENDIENTE explícito
    const pendientesExplicitos = await Expediente.countDocuments({
      'metadatos.estadoGeneral': 'PENDIENTE'
    });
    console.log(`Expedientes con estado PENDIENTE explícito: ${pendientesExplicitos}`);
    
    // Hipótesis 2: Expedientes sin facturas y sin pedidos facturados
    const pendientesPorDefinicion = await Expediente.countDocuments({
      'facturas.0': { $exists: false },
      'pedidos': { 
        $not: { 
          $elemMatch: { 
            'estatus': { $in: ['FACTURADO', 'FACTURADO POR EXPEDIENTE'] } 
          } 
        } 
      }
    });
    console.log(`Expedientes sin facturas y sin pedidos facturados: ${pendientesPorDefinicion}`);
    
    // Hipótesis 3: Expedientes específicos de IKE o DEMO (que podrían tener tratamiento especial)
    const expedientesIKE = await Expediente.countDocuments({ 'cliente': 'IKE' });
    const expedientesDEMO = await Expediente.countDocuments({ 'cliente': 'DEMO' });
    console.log(`Expedientes cliente IKE: ${expedientesIKE}`);
    console.log(`Expedientes cliente DEMO: ${expedientesDEMO}`);
    
    console.log(chalk.green('\n✅ DIAGNÓSTICO COMPLETADO'));
    
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
    
  } catch (error) {
    console.error(chalk.red('❌ ERROR:'), error);
    
    // Intentar cerrar conexión a MongoDB
    try {
      await mongoose.connection.close();
    } catch (err) {}
    
    process.exit(1);
  }
}

// Ejecutar script
main();