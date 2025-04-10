/**
 * Punto de entrada para el módulo Concentrador
 */
import { connectToDatabase } from '../db/connection.js';
import * as normalizationService from './services/normalization.js';
import * as duplicatesService from './services/duplicates.js';
import * as integrationService from './services/integration.js';

/**
 * Inicializa el concentrador y ejecuta el proceso de consolidación
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Object>} - Resultado del proceso
 */
export async function runConcentrador(options = {}) {
  // Establecer conexión a MongoDB
  const db = await connectToDatabase();
  
  console.log('Iniciando proceso de concentrador...');
  
  try {
    // 1. Normalizar registros
    const normalizedRecords = await normalizationService.normalizeRecords(
      options.cliente || 'IKE'
    );
    console.log(`Registros normalizados: ${normalizedRecords.length}`);
    
    // 2. Detectar duplicados
    const duplicatesResult = await duplicatesService.detectDuplicates(
      normalizedRecords
    );
    console.log(`Duplicados detectados: ${duplicatesResult.duplicates.length}`);
    
    // 3. Integrar resultados
    const integrationResult = await integrationService.integrateResults(
      normalizedRecords,
      duplicatesResult
    );
    
    return {
      totalRecords: normalizedRecords.length,
      uniqueRecords: integrationResult.uniqueRecords.length,
      duplicateRecords: duplicatesResult.duplicates.length,
      processedAt: new Date()
    };
  } catch (error) {
    console.error('Error en proceso de concentrador:', error);
    throw error;
  }
}

export default {
  runConcentrador
};