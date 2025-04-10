#!/usr/bin/env node
/**
 * Script de prueba básica para el concentrador
 * 
 * Este script ejecuta y verifica la funcionalidad básica del concentrador:
 * 1. Conexión a MongoDB
 * 2. Normalización de registros
 * 3. Detección de duplicados
 * 4. Integración de resultados
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { mongoose } from '../core/db/connection.js';
import { connectToDatabase } from '../core/db/connection.js';
import * as normalizationService from '../core/concentrador/services/normalization.js';
import * as duplicatesService from '../core/concentrador/services/duplicates.js';
import * as integrationService from '../core/concentrador/services/integration.js';

// Función principal de prueba
async function runBasicTest() {
  console.log('=== PRUEBA BÁSICA DEL CONCENTRADOR ===\n');
  
  try {
    // PASO 1: Verificar conexión a MongoDB
    console.log('Paso 1: Verificando conexión a MongoDB...');
    const db = await connectToDatabase();
    console.log('✅ Conexión a MongoDB establecida correctamente\n');
    
    // PASO 2: Normalizar registros
    console.log('Paso 2: Normalizando registros...');
    const cliente = 'IKE'; // Cliente de prueba
    const normalizedRecords = await normalizationService.normalizeRecords(cliente);
    console.log(`✅ Normalización completada: ${normalizedRecords.length} registros procesados`);
    
    if (normalizedRecords.length === 0) {
      console.log('⚠️ No se encontraron registros para normalizar. Verifique que existan datos en MongoDB.');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Mostrar ejemplo de registro normalizado
    console.log('\nEjemplo de registro normalizado:');
    console.log(JSON.stringify(normalizedRecords[0], null, 2).substring(0, 500) + '...');
    
    // PASO 3: Detectar duplicados
    console.log('\nPaso 3: Detectando duplicados...');
    const duplicatesResult = await duplicatesService.detectDuplicates(normalizedRecords);
    console.log(`✅ Detección de duplicados completada:`);
    console.log(`   - Registros únicos: ${duplicatesResult.uniqueRecords.length}`);
    console.log(`   - Duplicados: ${duplicatesResult.duplicates.length}`);
    
    // PASO 4: Integrar resultados
    console.log('\nPaso 4: Integrando resultados...');
    const integrationResult = await integrationService.integrateResults(
      normalizedRecords,
      duplicatesResult
    );
    console.log(`✅ Integración completada: ${integrationResult.totalUpdated} registros actualizados`);
    
    // Resumen final
    console.log('\n=== RESUMEN DE LA PRUEBA ===');
    console.log(`Total registros procesados: ${normalizedRecords.length}`);
    console.log(`Registros únicos: ${duplicatesResult.uniqueRecords.length}`);
    console.log(`Duplicados: ${duplicatesResult.duplicates.length}`);
    console.log(`Registros actualizados: ${integrationResult.totalUpdated}`);
    console.log('\n✅ Prueba completada con éxito');
    
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA PRUEBA:');
    console.error(error);
    
    // Intentar cerrar conexión a MongoDB
    try {
      await mongoose.connection.close();
    } catch (err) {}
    
    process.exit(1);
  }
}

// Ejecutar la prueba
runBasicTest();