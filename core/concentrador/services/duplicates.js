/**
 * Servicio de detección de duplicados
 */
import mongoose from 'mongoose';
import Expediente from '../../db/models/expediente.js';
import { Log } from '../../db/models/log.js';
import { normalizeExpediente } from '../utils/normalizers.js';

/**
 * Detecta duplicados en un conjunto de registros normalizados
 * @param {Array} records - Registros normalizados
 * @returns {Promise<Object>} - Resultado con únicos y duplicados
 */
export async function detectDuplicates(records) {
  try {
    console.log(`Analizando ${records.length} registros para detección de duplicados`);
    
    const uniqueMap = new Map();
    const duplicates = [];
    
    // Primera pasada: indexar por número de expediente
    for (const record of records) {
      const key = normalizeExpediente(record.numeroExpediente);
      
      if (uniqueMap.has(key)) {
        const existing = uniqueMap.get(key);
        const existingDate = new Date(existing.fechaMasReciente || existing.ultimaActualizacion || 0);
        const currentDate = new Date(record.fechaMasReciente || record.ultimaActualizacion || 0);
        
        if (currentDate > existingDate) {
          duplicates.push({ ...existing, razonDuplicado: 'VERSIÓN_ANTERIOR' });
          uniqueMap.set(key, record);
        } else {
          duplicates.push({ ...record, razonDuplicado: 'VERSIÓN_ANTERIOR' });
        }
      } else {
        uniqueMap.set(key, record);
      }
    }

    const uniqueRecords = Array.from(uniqueMap.values());
    const clasificarDuplicados = duplicates.map(dup => {
      if (!dup.razonDuplicado) dup.razonDuplicado = 'VERSIÓN_ANTERIOR';
      return dup;
    });

    console.log(`Procesamiento completo: ${uniqueRecords.length} únicos, ${clasificarDuplicados.length} duplicados`);
    
    return { uniqueRecords, duplicates: clasificarDuplicados, totalProcessed: records.length };
  } catch (error) {
    console.error('Error al detectar duplicados:', error);
    throw error;
  }
}

/**
 * Detecta duplicados directamente en MongoDB
 * @param {String} cliente - Código del cliente
 * @returns {Promise<Object>} - Resultado con estadísticas
 */
export async function detectDuplicatesInDatabase(cliente) {
  try {
    console.log(`Detectando duplicados en BD para cliente: ${cliente}`);
    
    const duplicadosAggregate = await Expediente.aggregate([
      { $match: { cliente } },
      { $group: {
        _id: "$numeroExpediente",
        count: { $sum: 1 },
        expedientes: { $push: {
          id: "$_id",
          numeroExpediente: "$numeroExpediente",
          ultimaActualizacion: "$metadatos.ultimaActualizacion",
          pedidos: "$pedidos",
          facturas: "$facturas"
        }}
      }},
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);

    let totalDuplicados = 0;
    let totalActualizados = 0;

    for (const grupo of duplicadosAggregate) {
      totalDuplicados += grupo.count - 1;
      const expedientesOrdenados = grupo.expedientes.sort((a, b) => 
        new Date(b.ultimaActualizacion || 0) - new Date(a.ultimaActualizacion || 0));
      
      const [principal, ...duplicados] = expedientesOrdenados;
      
      await Expediente.updateOne(
        { _id: principal.id },
        { $set: { 
          'metadatos.esDuplicado': false,
          'metadatos.esUnico': true,
          'metadatos.procesadoPorConcentrador': true,
          'metadatos.ultimaActualizacionConcentrador': new Date()
        }}
      );
      totalActualizados++;

      for (const dup of duplicados) {
        await Expediente.updateOne(
          { _id: dup.id },
          { $set: {
            'metadatos.esDuplicado': true,
            'metadatos.esUnico': false,
            'metadatos.razonDuplicado': 'VERSIÓN_ANTERIOR',
            'metadatos.expedientePrincipal': principal.numeroExpediente,
            'metadatos.procesadoPorConcentrador': true,
            'metadatos.ultimaActualizacionConcentrador': new Date()
          }}
        );
        totalActualizados++;
      }
    }

    await Log.create({
      timestamp: new Date(),
      operacion: 'deteccion_duplicados',
      cliente,
      detalles: {
        gruposDuplicados: duplicadosAggregate.length,
        registrosDuplicados: totalDuplicados,
        registrosActualizados: totalActualizados
      }
    });

    return { gruposDuplicados: duplicadosAggregate.length, totalDuplicados, totalActualizados };
  } catch (error) {
    console.error('Error al detectar duplicados en BD:', error);
    throw error;
  }
}

export default { detectDuplicates, detectDuplicatesInDatabase };
