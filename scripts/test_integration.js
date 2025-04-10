/**
 * Ruta: scripts/test_integration.js
 * 
 * Script para probar la integración entre los distintos componentes del sistema
 * 
 * Este script prueba:
 * 1. La conexión a MongoDB
 * 2. La API REST
 * 3. La existencia de scripts Python
 */

import * as dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { connectToDatabase, mongoose } from '../core/db/connection.js';
import apiServer from '../web/server/app.js';

// Rutas
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PORT = process.env.TEST_PORT || 3030;

// Color para log
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Función para realizar peticiones HTTP
async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          reject(new Error(`Error al parsear respuesta: ${error.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Prueba: Conexión a MongoDB
async function testMongoDBConnection() {
  console.log('\n=== PRUEBA: CONEXIÓN A MONGODB ===');
  
  try {
    const db = await connectToDatabase();
    console.log(`${GREEN}✓ Conexión a MongoDB establecida correctamente${RESET}`);
    
    // Listar colecciones
    const collections = await db.db.listCollections().toArray();
    console.log(`${GREEN}✓ Colecciones disponibles: ${collections.map(c => c.name).join(', ')}${RESET}`);
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log(`${GREEN}✓ Conexión cerrada correctamente${RESET}`);
    
    return true;
  } catch (error) {
    console.error(`${RED}✗ Error al conectar a MongoDB: ${error.message}${RESET}`);
    return false;
  }
}

// Prueba: API REST
async function testAPIEndpoints() {
  console.log('\n=== PRUEBA: API REST ===');
  
  let server;
  
  try {
    // Iniciar servidor en puerto de prueba
    server = apiServer.listen(TEST_PORT);
    console.log(`${GREEN}✓ Servidor de prueba iniciado en puerto ${TEST_PORT}${RESET}`);
    
    // Dar tiempo a que el servidor inicie completamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Probar endpoint de estado
    console.log(`${YELLOW}Probando endpoint /api/status...${RESET}`);
    const statusResponse = await makeRequest(`http://localhost:${TEST_PORT}/api/status`);
    
    if (statusResponse.statusCode === 200 && statusResponse.data.status === 'online') {
      console.log(`${GREEN}✓ Endpoint /api/status responde correctamente${RESET}`);
    } else {
      console.error(`${RED}✗ Error en endpoint /api/status: ${JSON.stringify(statusResponse)}${RESET}`);
      return false;
    }
    
    // Probar endpoint de expedientes
    console.log(`${YELLOW}Probando endpoint /api/expedientes...${RESET}`);
    const expedientesResponse = await makeRequest(`http://localhost:${TEST_PORT}/api/expedientes`);
    
    if (expedientesResponse.statusCode === 200 && expedientesResponse.data.success) {
      console.log(`${GREEN}✓ Endpoint /api/expedientes responde correctamente${RESET}`);
      console.log(`${GREEN}✓ Total de expedientes: ${expedientesResponse.data.total}${RESET}`);
      console.log(`${GREEN}✓ Expedientes en página actual: ${expedientesResponse.data.count}${RESET}`);
    } else {
      console.error(`${RED}✗ Error en endpoint /api/expedientes: ${JSON.stringify(expedientesResponse)}${RESET}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`${RED}✗ Error en prueba de API: ${error.message}${RESET}`);
    return false;
  } finally {
    // Detener servidor
    if (server) {
      server.close();
      console.log(`${GREEN}✓ Servidor de prueba detenido${RESET}`);
    }
  }
}

// Prueba: Verificar archivo Python
async function testPythonFiles() {
  console.log('\n=== PRUEBA: VERIFICACIÓN DE ARCHIVOS PYTHON ===');
  
  // Verificar que existen los scripts
  const scripts = [
    path.join(__dirname, '..', 'modules', 'ike-processor', 'scripts', 'export_mongodb.py'),
    path.join(__dirname, '..', 'modules', 'ike-processor', 'scripts', 'extract.py'),
    path.join(__dirname, '..', 'modules', 'ike-processor', 'scripts', 'detect.py')
  ];
  
  let allExist = true;
  
  for (const scriptPath of scripts) {
    if (fs.existsSync(scriptPath)) {
      console.log(`${GREEN}✓ Script encontrado: ${scriptPath}${RESET}`);
    } else {
      console.error(`${RED}✗ Script no encontrado: ${scriptPath}${RESET}`);
      allExist = false;
    }
  }
  
  return allExist;
}

// Función principal
async function runIntegrationTests() {
  console.log('=== PRUEBAS DE INTEGRACIÓN BÁSICAS DEL SISTEMA ===\n');
  
  // Verificar dependencias
  console.log('Verificando dependencias requeridas...');
  
  try {
    // Intentar importar dependencias críticas
    const mongoose = await import('mongoose');
    const express = await import('express');
    console.log(`${GREEN}✓ Dependencias Node.js básicas están instaladas${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Error al importar dependencias Node.js: ${error.message}${RESET}`);
    console.error(`${YELLOW}Ejecuta 'npm install' para instalar las dependencias faltantes${RESET}`);
    return 1;
  }
  
  // Almacenar resultados
  const results = {
    mongoDBConnection: false,
    apiEndpoints: false,
    pythonFiles: false
  };
  
  // Ejecutar pruebas
  results.mongoDBConnection = await testMongoDBConnection();
  results.apiEndpoints = await testAPIEndpoints();
  results.pythonFiles = await testPythonFiles();
  
  // Resumen de resultados
  console.log('\n=== RESUMEN DE PRUEBAS ===');
  console.log(`MongoDB Connection:    ${results.mongoDBConnection ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`}`);
  console.log(`API Endpoints:         ${results.apiEndpoints ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`}`);
  console.log(`Python Files:          ${results.pythonFiles ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`}`);
  
  // Resultado final
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log(`\n${GREEN}✅ TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON EXITOSAMENTE${RESET}`);
    return 0; // Código de salida exitoso
  } else {
    console.log(`\n${RED}❌ ALGUNAS PRUEBAS DE INTEGRACIÓN FALLARON${RESET}`);
    return 1; // Código de salida con error
  }
}

// Ejecutar si se llama directamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runIntegrationTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error(`${RED}Error inesperado: ${error.message}${RESET}`);
      process.exit(1);
    });
}

export default runIntegrationTests;