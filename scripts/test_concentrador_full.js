#!/usr/bin/env node
/**
 * Script para probar el flujo completo del concentrador
 */
import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import * as concentrador from '../core/concentrador/index.js';
import * as normalizationService from '../core/concentrador/services/normalization.js';
import * as duplicatesService from '../core/concentrador/services/duplicates.js';
import * as integrationService from '../core/concentrador/services/integration.js';

async function runFullTest() {
  try {
    console.log('=== PRUEBA COMPLETA DEL CONCENTRADOR ===\n');
    
    // PASO 1: Prueba de normalización
    console.log('PASO 1: Normalización de registros');
    console.log('------------------------------------');
    console.log('Normalizando registros para cliente IKE...');
    const normalizedRecords = await normalizationService.normalizeRecords('IKE');
    console.log(`✅ Normalización completa: ${normalizedRecords.length} registros procesados`);
    
    // Normalizar tipo de servicio
    console.log('\nNormalizando tipos de servicio...');
    const tipoNormResult = await normalizationService.normalizeTipoServicio('IKE');
    console.log(`✅ Normalización de tipos completada: ${tipoNormResult.totalUpdated} registros actualizados`);
    
    // PASO 2: Prueba de detección de duplicados
    console.log('\nPASO 2: Detección de duplicados');
    console.log('------------------------------------');
    console.log('Detectando duplicados en memoria...');
    const duplicatesResult = await duplicatesService.detectDuplicates(normalizedRecords);
    console.log(`✅ Detección completada:`);
    console.log(`   - Registros únicos: ${duplicatesResult.uniqueRecords.length}`);
    console.log(`   - Duplicados: ${duplicatesResult.duplicates.length}`);
    
    // Detectar duplicados directamente en BD
    console.log('\nDetectando duplicados directamente en base de datos...');
    const dbDuplicatesResult = await duplicatesService.detectDuplicatesInDatabase('IKE');
    console.log(`✅ Detección en BD completada:`);
    console.log(`   - Grupos de duplicados: ${dbDuplicatesResult.gruposDuplicados}`);
    console.log(`   - Total duplicados: ${dbDuplicatesResult.totalDuplicados}`);
    
    // PASO 3: Prueba de integración
    console.log('\nPASO 3: Integración de resultados');
    console.log('------------------------------------');
    console.log('Integrando resultados para cliente IKE...');
    const integrationResult = await integrationService.integrateResults(
      normalizedRecords,
      duplicatesResult
    );
    console.log(`✅ Integración completada: ${integrationResult.totalUpdated} registros actualizados`);
    
    // Integración multifuente
    console.log('\nIntegrando múltiples fuentes...');
    const multiSourceResult = await integrationService.integrateMultipleSources();
    console.log(`✅ Integración multifuente completada:`);
    console.log(`   - Clientes procesados: ${multiSourceResult.totales.totalClientes}`);
    console.log(`   - Total expedientes: ${multiSourceResult.totales.totalExpedientes}`);
    console.log(`   - Expedientes únicos: ${multiSourceResult.totales.totalUnicos}`);
    console.log(`   - Expedientes duplicados: ${multiSourceResult.totales.totalDuplicados}`);
    
    // PASO 4: Ejecutar concentrador completo
    console.log('\nPASO 4: Flujo completo del concentrador');
    console.log('------------------------------------');
    console.log('Ejecutando concentrador completo para cliente IKE...');
    const result = await concentrador.runConcentrador({
      cliente: 'IKE'
    });
    
    console.log('\n=== RESULTADO FINAL ===');
    console.log(JSON.stringify(result, null, 2));
    
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log('\n✅ Prueba completa finalizada');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    console.error(error);
    
    // Intentar cerrar conexión a MongoDB
    try {
      await mongoose.connection.close();
    } catch (err) {}
    
    process.exit(1);
  }
}

// Ejecutar la prueba
runFullTest();