#!/usr/bin/env node
/**
 * Script para probar el funcionamiento del concentrador
 */
import * as dotenv from 'dotenv';
dotenv.config();
import * as concentrador from '../core/concentrador/index.js';

async function runTest() {
  console.log('=== PRUEBA DEL CONCENTRADOR ===');
  
  try {
    // Ejecutar el concentrador para cliente IKE
    const result = await concentrador.runConcentrador({
      cliente: 'IKE'
    });
    
    console.log('\n=== RESULTADO DEL PROCESO ===');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('\n=== ERROR EN EL PROCESO ===');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la prueba
runTest();