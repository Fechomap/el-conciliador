#!/usr/bin/env node
/**
 * Script para resetear estados de facturación en MongoDB
 * 
 * Este script:
 * 1. Identifica expedientes marcados como facturados
 * 2. Muestra un reporte de la situación actual
 * 3. Restablece todos los expedientes a estado "PENDIENTE"
 * 4. Verifica que la actualización se haya completado
 * 
 * Uso: node scripts/reset-facturacion.js [--dry-run]
 * Opciones:
 *   --dry-run  Solo muestra qué se actualizaría sin realizar cambios
 */

import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectToDatabase } from '../core/db/connection.js';
import chalk from 'chalk'; // Para colorear la salida en consola

// Cargar variables de entorno
dotenv.config();

// Verificar si es modo simulación
const isDryRun = process.argv.includes('--dry-run');

// Definir modelo de Expediente directamente para este script
const expedienteSchema = new mongoose.Schema({
  numeroExpediente: String,
  cliente: String,
  metadatos: {
    facturado: Boolean,
    estadoGeneral: String,
    ultimaActualizacion: Date
  },
  facturas: [mongoose.Schema.Types.Mixed],
  pedidos: [mongoose.Schema.Types.Mixed]
}, { 
  collection: 'expedientes',
  strict: false
});

// Ejecutar el proceso principal
async function main() {
  console.log(chalk.blue('=== RESET DE ESTADOS DE FACTURACIÓN ==='));
  console.log(chalk.yellow(`Modo: ${isDryRun ? 'Simulación (no se realizarán cambios)' : 'Actualización real'}`));
  
  try {
    // Conectar a MongoDB
    await connectToDatabase();
    console.log(chalk.green('✅ Conexión a MongoDB establecida'));
    
    // Crear modelo temporal
    const Expediente = mongoose.model('Expediente', expedienteSchema);
    
    // 1. Contar total de expedientes
    const totalExpedientes = await Expediente.countDocuments();
    console.log(chalk.blue(`\nTotal de expedientes en MongoDB: ${totalExpedientes}`));
    
    // 2. Consultar expedientes facturados
    const expedientesFacturados = await Expediente.countDocuments({
      'metadatos.facturado': true
    });
    
    // 3. Consultar expedientes con facturas
    const expedientesConFacturas = await Expediente.countDocuments({
      'facturas.0': { $exists: true }
    });
    
    // 4. Consultar expedientes con pedidos facturados
    const expedientesConPedidosFacturados = await Expediente.countDocuments({
      'pedidos': { 
        $elemMatch: { 
          'estatus': { $in: ['FACTURADO', 'FACTURADO POR EXPEDIENTE'] } 
        }
      }
    });
    
    // Mostrar reporte del estado actual
    console.log(chalk.blue('\n=== ESTADO ACTUAL ==='));
    console.log(`Expedientes marcados como facturados: ${chalk.yellow(expedientesFacturados)}`);
    console.log(`Expedientes con facturas: ${chalk.yellow(expedientesConFacturas)}`);
    console.log(`Expedientes con pedidos facturados: ${chalk.yellow(expedientesConPedidosFacturados)}`);
    
    // Verificar si hay inconsistencias
    if (expedientesFacturados !== (expedientesConFacturas + expedientesConPedidosFacturados)) {
      console.log(chalk.yellow('\n⚠️ POSIBLE INCONSISTENCIA:'));
      console.log('El número de expedientes facturados no coincide con la suma de expedientes con facturas y pedidos facturados.');
      console.log('Esto puede deberse a que algunos expedientes tienen tanto facturas como pedidos facturados.');
    }
    
    // Si es modo simulación, terminar aquí
    if (isDryRun) {
      console.log(chalk.yellow('\n🔍 MODO SIMULACIÓN: No se realizaron cambios.'));
      console.log(chalk.yellow('Para ejecutar la actualización real, omita el parámetro --dry-run'));
      await mongoose.connection.close();
      return;
    }
    
    // Realizar actualización
    console.log(chalk.blue('\n=== EJECUTANDO ACTUALIZACIÓN ==='));

    // 5. Actualizar todos los expedientes que están marcados como facturados
    const resultadoActualizacion = await Expediente.updateMany(
      { 'metadatos.facturado': true },
      { 
        $set: { 
          'metadatos.facturado': false,
          'metadatos.estadoGeneral': 'PENDIENTE',
          'metadatos.ultimaActualizacion': new Date()
        }
      }
    );
    
    console.log(chalk.green(`✅ Actualización completada: ${resultadoActualizacion.modifiedCount} expedientes actualizados`));
    
    // 6. Verificar si la actualización fue exitosa
    const expedientesFacturadosDespues = await Expediente.countDocuments({
      'metadatos.facturado': true
    });
    
    console.log(chalk.blue('\n=== VERIFICACIÓN POST-ACTUALIZACIÓN ==='));
    console.log(`Expedientes marcados como facturados antes: ${chalk.yellow(expedientesFacturados)}`);
    console.log(`Expedientes marcados como facturados después: ${chalk.yellow(expedientesFacturadosDespues)}`);
    
    if (expedientesFacturadosDespues === 0) {
      console.log(chalk.green('\n✅ ACTUALIZACIÓN EXITOSA: Todos los expedientes están ahora como NO FACTURADOS'));
    } else {
      console.log(chalk.red(`\n❌ ERROR: Todavía hay ${expedientesFacturadosDespues} expedientes marcados como facturados`));
    }
    
    // 7. OPCIONAL: Actualizar también los estados de los pedidos
    console.log(chalk.blue('\n=== ACTUALIZANDO ESTADOS DE PEDIDOS ==='));
    
    const resultadoActualizacionPedidos = await Expediente.updateMany(
      { 'pedidos.estatus': { $in: ['FACTURADO', 'FACTURADO POR EXPEDIENTE'] } },
      { $set: { 'pedidos.$[elem].estatus': 'NO FACTURADO' } },
      { arrayFilters: [{ 'elem.estatus': { $in: ['FACTURADO', 'FACTURADO POR EXPEDIENTE'] } }] }
    );
    
    console.log(chalk.green(`✅ Actualización de pedidos completada: afectó a ${resultadoActualizacionPedidos.modifiedCount} expedientes`));
    
    // 8. Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log(chalk.blue('\nConexión a MongoDB cerrada'));
    
    console.log(chalk.green('\n✅ PROCESO COMPLETADO EXITOSAMENTE'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERROR DURANTE LA EJECUCIÓN:'));
    console.error(error);
    
    // Intentar cerrar conexión a MongoDB
    try {
      await mongoose.connection.close();
      console.log(chalk.blue('\nConexión a MongoDB cerrada'));
    } catch (err) {}
    
    process.exit(1);
  }
}

// Ejecutar script
main();