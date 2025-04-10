/**
 * Servicio de integración de resultados
 */
import mongoose from 'mongoose';
import Expediente from '../../db/models/expediente.js';
import { Cliente } from '../../db/models/cliente.js';
import { Log } from '../../db/models/log.js';

/**
 * Integra los resultados del proceso de concentración
 * @param {Array} normalizedRecords - Registros normalizados
 * @param {Object} duplicatesResult - Resultado de detección de duplicados
 * @returns {Promise<Object>} - Resultado de la integración
 */
export async function integrateResults(normalizedRecords, duplicatesResult) {
  try {
    const { uniqueRecords, duplicates } = duplicatesResult;
    const cliente = uniqueRecords.length > 0 ? uniqueRecords[0].cliente : 'IKE';
    let updatedCount = 0;
    
    console.log(`Iniciando integración de resultados para cliente ${cliente}`);
    console.log(`Registros únicos: ${uniqueRecords.length}, Duplicados: ${duplicates.length}`);
    
    // Actualizar estado de los registros únicos
    for (const record of uniqueRecords) {
      await Expediente.updateOne(
        { _id: record.id },
        { 
          $set: {
            'metadatos.esUnico': true,
            'metadatos.procesadoPorConcentrador': true,
            'metadatos.ultimaActualizacionConcentrador': new Date()
          }
        }
      );
      updatedCount++;
    }
    
    // Actualizar estado de los duplicados
    for (const record of duplicates) {
      await Expediente.updateOne(
        { _id: record.id },
        { 
          $set: {
            'metadatos.esUnico': false,
            'metadatos.esDuplicado': true,
            'metadatos.razonDuplicado': record.razonDuplicado || 'DUPLICADO_CONCENTRADOR',
            'metadatos.procesadoPorConcentrador': true,
            'metadatos.ultimaActualizacionConcentrador': new Date()
          }
        }
      );
      updatedCount++;
    }
    
    // Registrar log de la operación
    await Log.create({
      timestamp: new Date(),
      operacion: 'integracion_concentrador',
      cliente,
      detalles: {
        registrosProcesados: normalizedRecords.length,
        registrosUnicos: uniqueRecords.length,
        registrosDuplicados: duplicates.length,
        registrosActualizados: updatedCount
      }
    });
    
    return {
      uniqueRecords,
      duplicateRecords: duplicates,
      totalUpdated: updatedCount,
      processedAt: new Date()
    };
  } catch (error) {
    console.error('Error en la integración de resultados:', error);
    throw error;
  }
}

/**
 * Integra datos de múltiples fuentes/clientes
 * @param {Array} clientes - Lista de códigos de cliente a integrar
 * @returns {Promise<Object>} - Resultado de la integración
 */
export async function integrateMultipleSources(clientes = null) {
  try {
    // Si no se especifican clientes, obtener todos los activos
    let clientesToProcess = clientes;
    if (!clientesToProcess) {
      const clientesActivos = await Cliente.find({ activo: true });
      clientesToProcess = clientesActivos.map(c => c.codigo);
    }
    
    console.log(`Integrando datos de ${clientesToProcess.length} fuentes`);
    
    const results = {};
    
    // Procesar cada cliente
    for (const cliente of clientesToProcess) {
      console.log(`Procesando cliente: ${cliente}`);
      
      // Agregar para contar expedientes por estado
      const estadisticas = await Expediente.aggregate([
        { $match: { cliente } },
        { $group: {
          _id: {
            esUnico: "$metadatos.esUnico",
            esDuplicado: "$metadatos.esDuplicado"
          },
          count: { $sum: 1 }
        }}
      ]);
      
      // Crear objeto de resultados para este cliente
      results[cliente] = {
        cliente,
        totalExpedientes: 0,
        unicos: 0,
        duplicados: 0,
        sinProcesar: 0,
        estadisticas
      };
      
      // Procesar estadísticas
      for (const stat of estadisticas) {
        const count = stat.count;
        results[cliente].totalExpedientes += count;
        
        // Clasificar según estado
        if (stat._id.esUnico === true) {
          results[cliente].unicos += count;
        } else if (stat._id.esDuplicado === true) {
          results[cliente].duplicados += count;
        } else {
          results[cliente].sinProcesar += count;
        }
      }
    }
    
    // Generar estadísticas globales
    const totales = {
      totalClientes: clientesToProcess.length,
      totalExpedientes: 0,
      totalUnicos: 0,
      totalDuplicados: 0,
      totalSinProcesar: 0
    };
    
    for (const cliente in results) {
      totales.totalExpedientes += results[cliente].totalExpedientes;
      totales.totalUnicos += results[cliente].unicos;
      totales.totalDuplicados += results[cliente].duplicados;
      totales.totalSinProcesar += results[cliente].sinProcesar;
    }
    
    // Registrar log de la operación
    await Log.create({
      timestamp: new Date(),
      operacion: 'integracion_multifuente',
      cliente: 'GLOBAL',
      detalles: totales
    });
    
    return {
      clientes: results,
      totales,
      processedAt: new Date()
    };
  } catch (error) {
    console.error('Error en la integración multifuente:', error);
    throw error;
  }
}

export default {
  integrateResults,
  integrateMultipleSources
};
