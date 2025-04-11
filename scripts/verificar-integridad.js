#!/usr/bin/env node
/**
 * Script de Verificación de Integridad de Datos: Concentrado General a MongoDB
 * 
 * Este script:
 * 1. Lee un archivo Excel del Concentrado General
 * 2. Busca los registros correspondientes en MongoDB
 * 3. Verifica que todos los campos del Excel se preserven en MongoDB
 * 4. Genera un reporte de integridad
 * 
 * Uso: 
 *   node scripts/verificar-integridad.js path/to/concentradogeneral.xlsx
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Configuración de __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Mapeo de columnas del Excel a nombres de campo en MongoDB
const COLUMNAS_CONCENTRADO = {
  // Columnas A-Z
  'A': 'numero',
  'B': 'cliente',
  'C': 'fechaRegistro',
  'D': 'fechaAsignacion',
  'E': 'unidadOperativa',
  'F': 'operador',
  'G': 'vehiculo',
  'H': 'placas',
  'I': 'usuario',
  'J': 'cuenta',
  'K': 'estatus',
  'L': 'origen',
  'M': 'entreCalles',
  'N': 'referencia',
  'O': 'coordenadasOrigen',
  'P': 'destino',
  'Q': 'coordenadasDestino',
  'R': 'tipoRecorrido',
  'S': 'casetaCobro',
  'T': 'casetaCubierta',
  'U': 'resguardo',
  'V': 'maniobras',
  'W': 'horaEspera',
  'X': 'parking',
  'Y': 'otros',
  'Z': 'excedente',
  
  // Columnas AA-AV
  'AA': 'topeCobertura',
  'AB': 'costoTotal',
  'AC': 'distanciaRecorrido',
  'AD': 'tiempoRecorrido',
  'AE': 'placasGrua',
  'AF': 'tipoGrua',
  'AG': 'color',
  'AH': 'ubicacionGruaDin',
  'AI': 'tiempoArriboDin',
  'AJ': 'ta',
  'AK': 'tc',
  'AL': 'tt',
  'AM': 'plano',
  'AN': 'banderazo',
  'AO': 'costoKm',
  'AP': 'distanciaRecorridoED',
  'AQ': 'tiempoArribo',
  'AR': 'servicioMuertoED',
  'AS': 'servicioMuertoBD',
  'AT': 'servicioMuertoBO',
  'AU': 'maniobrasAutorizadas',
  'AV': 'tipoServicio'
};

// Conectar a MongoDB
async function conectarMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conexión a MongoDB establecida');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    return false;
  }
}

// Normalizar número de expediente
function normalizeExpediente(expediente) {
  if (!expediente) return '';
  const expStr = String(expediente).replace(/[^0-9]/g, '');
  return expStr.padStart(8, '0');
}

// Función principal de verificación
async function verificarIntegridad(excelPath) {
  console.log(`\n=== VERIFICACIÓN DE INTEGRIDAD DE DATOS ===`);
  console.log(`Archivo Excel: ${excelPath}`);
  
  // Verificar que el archivo exista
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ El archivo Excel no existe: ${excelPath}`);
    return false;
  }
  
  // Conectar a MongoDB
  const conexionExitosa = await conectarMongoDB();
  if (!conexionExitosa) return false;
  
  // Definir esquema de Expediente directamente aquí para evitar problemas de importación
  const expedienteSchema = new mongoose.Schema({
    numeroExpediente: String,
    cliente: String,
    datos: mongoose.Schema.Types.Mixed,
    pedidos: [mongoose.Schema.Types.Mixed],
    facturas: [mongoose.Schema.Types.Mixed],
    metadatos: mongoose.Schema.Types.Mixed,
    datosConcentrado: mongoose.Schema.Types.Mixed
  }, { 
    strict: false,
    collection: 'expedientes' // Importante: usar el nombre real de la colección
  });
  
  // Crear modelo directamente
  const Expediente = mongoose.model('Expediente', expedienteSchema);
  
  // Leer el archivo Excel
  try {
    console.log('\nLeyendo archivo Excel...');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    
    console.log(`✅ Excel leído correctamente. ${excelData.length} registros encontrados.`);
    
    // Estadísticas de verificación
    const stats = {
      totalExcel: excelData.length,
      encontradosEnMongoDB: 0,
      camposPreservados: 0,
      totalCamposVerificados: 0,
      expedientesCompletos: 0,
      expedientesIncompletos: 0,
      faltantes: []
    };
    
    // Verificar integridad para una muestra del Excel (máximo 10 registros)
    const muestra = excelData.slice(0, 10);
    
    console.log(`\nVerificando integridad para ${muestra.length} registros de muestra...`);
    
    for (const [index, registro] of muestra.entries()) {
      // Obtener número de expediente
      const numeroExpediente = normalizeExpediente(registro['numero'] || registro['A'] || registro[0]);
      
      if (!numeroExpediente) {
        console.log(`⚠️ Registro #${index+1} sin número de expediente válido. Omitiendo...`);
        continue;
      }
      
      console.log(`\n--- Verificando expediente: ${numeroExpediente} ---`);
      
      try {
        // Buscar expediente en MongoDB
        const expedienteEnMongoDB = await Expediente.findOne({ numeroExpediente }).lean();
        
        if (!expedienteEnMongoDB) {
          console.log(`❌ Expediente no encontrado en MongoDB`);
          stats.faltantes.push(numeroExpediente);
          continue;
        }
        
        stats.encontradosEnMongoDB++;
        
        // Verificar que los campos del Excel estén en MongoDB
        let camposFaltantes = [];
        let camposCoincidentes = 0;
        
        // Total de campos a verificar para este expediente
        const camposVerificables = Object.entries(COLUMNAS_CONCENTRADO).reduce((count, [columna, nombreCampo]) => {
          // Verificar si el campo existe en el registro Excel
          const tieneValorEnExcel = registro[nombreCampo] !== undefined || 
                                    registro[columna] !== undefined ||
                                    registro[columna.charCodeAt(0) - 65] !== undefined;
          
          return tieneValorEnExcel ? count + 1 : count;
        }, 0);
        
        stats.totalCamposVerificados += camposVerificables;
        
        // Verificar coincidencia de campos
        for (const [columna, nombreCampo] of Object.entries(COLUMNAS_CONCENTRADO)) {
          // Obtener valor del Excel
          let valorExcel;
          if (registro[nombreCampo] !== undefined) {
            valorExcel = registro[nombreCampo];
          } else if (registro[columna] !== undefined) {
            valorExcel = registro[columna];
          } else {
            // Intentar por índice
            const colIndex = columna.charCodeAt(0) - 65;
            valorExcel = registro[colIndex];
          }
          
          // Si no hay valor en Excel, no verificar
          if (valorExcel === undefined) continue;
          
          // Verificar si existe en MongoDB
          const valorMongoDB = expedienteEnMongoDB.datosConcentrado?.[nombreCampo];
          
          if (valorMongoDB === undefined) {
            camposFaltantes.push(nombreCampo);
          } else {
            camposCoincidentes++;
          }
        }
        
        stats.camposPreservados += camposCoincidentes;
        
        // Reportar resultado para este expediente
        if (camposFaltantes.length > 0) {
          console.log(`⚠️ Expediente con ${camposFaltantes.length} campos faltantes:`);
          console.log(`   - ${camposFaltantes.join(', ')}`);
          stats.expedientesIncompletos++;
        } else {
          console.log(`✅ Todos los campos presentes en MongoDB (${camposCoincidentes}/${camposVerificables})`);
          stats.expedientesCompletos++;
        }
        
        // Verificar pedidos/facturas
        console.log(`   Pedidos: ${expedienteEnMongoDB.pedidos?.length || 0}`);
        console.log(`   Facturas: ${expedienteEnMongoDB.facturas?.length || 0}`);
      } catch (error) {
        console.error(`❌ Error al verificar expediente ${numeroExpediente}:`, error);
      }
    }
    
    // Estadísticas globales
    const porcentajeCamposConservados = stats.totalCamposVerificados > 0 
      ? (stats.camposPreservados / stats.totalCamposVerificados) * 100 
      : 0;
    
    const porcentajeExpedientesCompletos = stats.encontradosEnMongoDB > 0 
      ? (stats.expedientesCompletos / stats.encontradosEnMongoDB) * 100 
      : 0;
    
    // Resumen final
    console.log(`\n=== RESUMEN DE VERIFICACIÓN ===`);
    console.log(`Total expedientes en Excel: ${stats.totalExcel}`);
    console.log(`Expedientes verificados: ${muestra.length}`);
    console.log(`Encontrados en MongoDB: ${stats.encontradosEnMongoDB}`);
    console.log(`Expedientes completos: ${stats.expedientesCompletos} (${porcentajeExpedientesCompletos.toFixed(2)}%)`);
    console.log(`Expedientes incompletos: ${stats.expedientesIncompletos}`);
    console.log(`Expedientes no encontrados: ${stats.faltantes.length}`);
    console.log(`Integridad de campos: ${stats.camposPreservados}/${stats.totalCamposVerificados} (${porcentajeCamposConservados.toFixed(2)}%)`);
    
    if (stats.faltantes.length > 0) {
      console.log(`\nExpedientes no encontrados en MongoDB:`);
      console.log(stats.faltantes.join(', '));
    }
    
    // Verificar estructura con MongoDB Aggregation
    await verificarEstructuraAgregada(Expediente);
    
    return true;
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    return false;
  } finally {
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada.');
  }
}

// Verificar estructura de datos usando agregaciones
async function verificarEstructuraAgregada(Expediente) {
  try {
    console.log('\n=== ANÁLISIS DE ESTRUCTURA DE DATOS EN MONGODB ===');
    
    // 1. Obtener la cantidad total de documentos
    const totalDocs = await Expediente.countDocuments();
    console.log(`Total de documentos en colección: ${totalDocs}`);
    
    // 2. Verificar documento con más campos en datosConcentrado
    const maxCampos = await Expediente.aggregate([
      { $match: { datosConcentrado: { $exists: true } } },
      { $project: { 
        _id: 0, 
        numeroExpediente: 1,
        camposOriginales: { $size: { $objectToArray: "$datosConcentrado" } }
      }},
      { $sort: { camposOriginales: -1 } },
      { $limit: 1 }
    ]);
    
    if (maxCampos.length > 0) {
      console.log(`\nExpediente con más campos preservados: ${maxCampos[0].numeroExpediente}`);
      console.log(`Cantidad de campos: ${maxCampos[0].camposOriginales}`);
    } else {
      console.log(`\n⚠️ No se encontraron documentos con el campo datosConcentrado`);
    }
    
    // 3. Estadísticas sobre campos
    const campoStats = await Expediente.aggregate([
      { $project: { 
        _id: 0,
        tieneDatosConcentrado: { $cond: [{ $ifNull: ["$datosConcentrado", false] }, 1, 0] },
        tienePedidos: { $cond: [{ $gt: [{ $size: { $ifNull: ["$pedidos", []] } }, 0] }, 1, 0] },
        tieneFacturas: { $cond: [{ $gt: [{ $size: { $ifNull: ["$facturas", []] } }, 0] }, 1, 0] },
      }},
      { $group: {
        _id: null,
        total: { $sum: 1 },
        conDatosConcentrado: { $sum: "$tieneDatosConcentrado" },
        conPedidos: { $sum: "$tienePedidos" },
        conFacturas: { $sum: "$tieneFacturas" }
      }}
    ]);
    
    if (campoStats.length > 0) {
      const stats = campoStats[0];
      console.log(`\nEstadísticas de campos:`);
      console.log(`- Expedientes con datosConcentrado: ${stats.conDatosConcentrado}/${stats.total} (${((stats.conDatosConcentrado/stats.total)*100).toFixed(2)}%)`);
      console.log(`- Expedientes con pedidos: ${stats.conPedidos}/${stats.total} (${((stats.conPedidos/stats.total)*100).toFixed(2)}%)`);
      console.log(`- Expedientes con facturas: ${stats.conFacturas}/${stats.total} (${((stats.conFacturas/stats.total)*100).toFixed(2)}%)`);
    }
    
    // 4. Buscar campo específico que queramos verificar
    // Por ejemplo, verificar cuántos tienen el campo "distanciaRecorrido"
    const camposEspecificos = [
      'distanciaRecorrido',  // AC
      'tipoServicio',        // AV
      'operador',            // F
      'placasGrua'           // AE
    ];
    
    console.log('\nVerificación de campos específicos:');
    
    for (const campo of camposEspecificos) {
      const conteo = await Expediente.countDocuments({
        [`datosConcentrado.${campo}`]: { $exists: true }
      });
      
      console.log(`- Campo '${campo}': ${conteo}/${totalDocs} (${((conteo/totalDocs)*100).toFixed(2)}%)`);
    }
    
  } catch (error) {
    console.error('❌ Error en análisis de estructura:', error);
  }
}

// Ejecutar verificación si se llama directamente
const excelPath = process.argv[2];

if (!excelPath) {
  console.error('❌ Debe especificar la ruta al archivo Excel del Concentrado General');
  console.log('Uso: node scripts/verificar-integridad.js path/to/concentradogeneral.xlsx');
  process.exit(1);
}

verificarIntegridad(excelPath)
  .then(exito => {
    process.exit(exito ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });

export { verificarIntegridad };