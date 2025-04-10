/**
 * Script para probar la API REST
 * 
 * Este script realiza llamadas a los diferentes endpoints 
 * de la API para verificar su funcionamiento.
 * 
 * Ejecutar con: node scripts/test_api.js
 */

import * as dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import api from '../core/api/index.js';
import { connectToDatabase, mongoose } from '../core/db/connection.js';

// Puerto para el servidor de pruebas
const PORT = process.env.TEST_PORT || 3001;

// Función para hacer una petición HTTP
async function hacerPeticion(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        } catch (error) {
          reject(new Error(`Error al parsear respuesta: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Función para probar endpoints
async function probarEndpoint(nombre, path, validacion) {
  try {
    console.log(`\nProbando ${nombre}: ${path}`);
    const response = await hacerPeticion(path);
    
    console.log(`Código de estado: ${response.statusCode}`);
    
    if (response.statusCode !== 200) {
      console.log(`❌ Error: ${response.data.message}`);
      return false;
    }
    
    // Si hay función de validación, ejecutarla
    if (validacion && typeof validacion === 'function') {
      const resultado = validacion(response.data);
      if (resultado === true) {
        console.log('✅ Validación exitosa');
        return true;
      } else {
        console.log(`❌ Fallo en validación: ${resultado}`);
        return false;
      }
    } else {
      // Verificar success básico
      if (response.data.success === true) {
        console.log('✅ Respuesta exitosa');
        return true;
      } else {
        console.log('❌ La respuesta no indica éxito');
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Error al probar ${nombre}: ${error.message}`);
    return false;
  }
}

// Función principal de prueba
async function probarAPI() {
  let server;
  
  try {
    console.log('=== PRUEBA DE API REST ===');
    
    // Conectar a MongoDB
    await connectToDatabase();
    console.log('✅ Conexión a MongoDB establecida');
    
    // Iniciar el servidor para las pruebas
    server = http.createServer(api);
    server.listen(PORT, () => {
      console.log(`✅ Servidor de pruebas iniciado en puerto ${PORT}`);
    });
    
    // Esperar a que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // === PRUEBAS DE ENDPOINTS ===
    const resultados = [];
    
    // 1. Probar endpoint base
    resultados.push(await probarEndpoint(
      'Endpoint base',
      '/api',
      (data) => {
        return data.name && data.version && data.status === 'running';
      }
    ));
    
    // 2. Probar listado de expedientes
    resultados.push(await probarEndpoint(
      'Listado de expedientes',
      '/api/expedientes',
      (data) => {
        return Array.isArray(data.data) && data.pagination && typeof data.total === 'number';
      }
    ));
    
    // 3. Probar filtro por cliente
    resultados.push(await probarEndpoint(
      'Filtro por cliente',
      '/api/expedientes?cliente=IKE',
      (data) => {
        return data.data.every(exp => exp.cliente === 'IKE');
      }
    ));
    
    // 4. Probar paginación
    resultados.push(await probarEndpoint(
      'Paginación',
      '/api/expedientes?page=1&limit=5',
      (data) => {
        return data.data.length <= 5 && data.pagination.page === 1 && data.pagination.limit === 5;
      }
    ));
    
    // 5. Probar expedientes de un cliente específico
    resultados.push(await probarEndpoint(
      'Expedientes por cliente',
      '/api/expedientes/cliente/IKE',
      (data) => {
        return Array.isArray(data.data) && 
               data.data.length > 0 && 
               data.data.every(exp => exp.cliente === 'IKE');
      }
    ));
    
    // 6. Obtener todos los clientes
    resultados.push(await probarEndpoint(
      'Listado de clientes',
      '/api/clientes',
      (data) => {
        return Array.isArray(data.data) && 
               data.data.some(cliente => cliente.codigo === 'IKE');
      }
    ));
    
    // Si tenemos al menos un expediente, probar más endpoints
    const primeraConsulta = await hacerPeticion('/api/expedientes?limit=1');
    if (primeraConsulta.statusCode === 200 && primeraConsulta.data.data.length > 0) {
      const primerExpediente = primeraConsulta.data.data[0];
      
      // 7. Obtener expediente por ID
      resultados.push(await probarEndpoint(
        'Expediente por ID',
        `/api/expedientes/${primerExpediente._id}`,
        (data) => {
          return data.data._id === primerExpediente._id;
        }
      ));
      
      // 8. Obtener expediente por número
      resultados.push(await probarEndpoint(
        'Expediente por número',
        `/api/expedientes/numero/${primerExpediente.numeroExpediente}`,
        (data) => {
          return data.data.expediente.numeroExpediente === primerExpediente.numeroExpediente;
        }
      ));
    }
    
    // 9. Probar endpoint de estadísticas
    resultados.push(await probarEndpoint(
      'Estadísticas',
      '/api/expedientes/estadisticas',
      (data) => {
        return data.data && 
               data.data.totales && 
               typeof data.data.totales.expedientes === 'number';
      }
    ));
    
    // 10. Probar búsqueda de expedientes duplicados
    resultados.push(await probarEndpoint(
      'Expedientes duplicados',
      '/api/expedientes/duplicados',
      (data) => {
        return Array.isArray(data.data);
      }
    ));
    
    // Mostrar resumen de resultados
    const exitosos = resultados.filter(r => r).length;
    const fallidos = resultados.length - exitosos;
    
    console.log('\n=== RESUMEN DE PRUEBAS ===');
    console.log(`Total de pruebas: ${resultados.length}`);
    console.log(`Pruebas exitosas: ${exitosos}`);
    console.log(`Pruebas fallidas: ${fallidos}`);
    
    if (fallidos === 0) {
      console.log('\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
    } else {
      console.log('\n⚠️ ALGUNAS PRUEBAS FALLARON');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LAS PRUEBAS:');
    console.error(error);
  } finally {
    // Detener el servidor
    if (server) {
      server.close(() => {
        console.log('Servidor de pruebas detenido');
      });
    }
    
    // Cerrar conexión a MongoDB
    try {
      await mongoose.connection.close();
      console.log('MongoDB: Conexión cerrada');
    } catch (err) {}
  }
}

// Ejecutar pruebas
probarAPI();