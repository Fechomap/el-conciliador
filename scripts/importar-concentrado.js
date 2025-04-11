#!/usr/bin/env node
/**
 * Script para Importar el Concentrado General a MongoDB
 * 
 * Este script:
 * 1. Lee el archivo Excel del Concentrado General
 * 2. Mapea todas las columnas (A-AV) a la estructura de MongoDB
 * 3. Inserta o actualiza los documentos en MongoDB
 * 4. Genera un reporte del proceso
 * 
 * Uso:
 *   node scripts/importar-concentrado.js [ruta-excel]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk'; // Para colorear la salida en consola

// Configuración de __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Mapeo explícito de columnas del Excel a MongoDB
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
    console.log(chalk.green('✅ Conexión a MongoDB establecida'));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Error conectando a MongoDB:'), error.message);
    return false;
  }
}

// Convertir fecha de Excel a Date
function parseDate(excelDate) {
  if (!excelDate) return null;
  
  // Si ya es un objeto Date, devolverlo
  if (excelDate instanceof Date && !isNaN(excelDate.getTime())) {
    return excelDate;
  }
  
  try {
    // Convertir number o string a fecha
    if (typeof excelDate === 'number') {
      // Número serial de Excel (días desde 1/1/1900)
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return date;
    }
    
    if (typeof excelDate === 'string') {
      // Intentar parsing de formatos comunes de fecha
      
      // Formato DD/MM/YYYY
      const dmyMatch = excelDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        return new Date(year, month - 1, day);
      }
      
      // Intentar Date.parse como último recurso
      const parsedDate = new Date(excelDate);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error parseando fecha:', e);
    return null;
  }
}

// Convertir valor a número
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  
  // Si ya es número, devolverlo
  if (typeof value === 'number') return value;
  
  try {
    // Limpiar formato de moneda y separadores
    const cleaned = String(value)
      .replace(/[$,\s]/g, '')
      .replace(/\.(?=.*\.)/g, '') // Mantener solo el último punto decimal
      .replace(',', '.'); // Cambiar coma decimal por punto
      
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch (e) {
    return null;
  }
}

// Normalizar número de expediente (asegurar 8 dígitos)
function normalizeExpediente(expediente) {
  if (!expediente) return '';
  
  // Convertir a string y eliminar caracteres no numéricos
  const expStr = String(expediente).replace(/[^0-9]/g, '');
  
  // Asegurar 8 dígitos con ceros a la izquierda
  return expStr.padStart(8, '0');
}

// Normalizar cliente (mayúsculas, sin espacios)
function normalizeCliente(cliente) {
  if (!cliente) return '';
  return String(cliente).replace(/\s+/g, '').toUpperCase();
}

// Mapear una fila del Excel a documento MongoDB
function mapearFilaADocumento(fila) {
  // Obtener número de expediente y cliente (campos clave)
  const numeroExpediente = normalizeExpediente(fila['numero'] || fila['A'] || fila[0]);
  const cliente = normalizeCliente(fila['cliente'] || fila['B'] || fila[1]);
  
  if (!numeroExpediente) {
    return { error: 'Fila sin número de expediente válido' };
  }
  
  // Crear estructura base del documento
  const documento = {
    numeroExpediente,
    cliente: cliente || 'DESCONOCIDO',
    
    // Datos estructurados para facilitar consultas
    datos: {
      fechaCreacion: parseDate(fila['fechaRegistro'] || fila['C']),
      fechaAsignacion: parseDate(fila['fechaAsignacion'] || fila['D']),
      tipoServicio: fila['tipoServicio'] || fila['AV'],
      ubicacion: {
        origen: fila['origen'] || fila['L'],
        destino: fila['destino'] || fila['P'],
        coordenadasOrigen: fila['coordenadasOrigen'] || fila['O'],
        coordenadasDestino: fila['coordenadasDestino'] || fila['Q'],
        entreCalles: fila['entreCalles'] || fila['M'],
        referencia: fila['referencia'] || fila['N']
      },
      vehiculo: {
        tipo: fila['vehiculo'] || fila['G'],
        placas: fila['placas'] || fila['H'],
        color: fila['color'] || fila['AG']
      },
      operador: fila['operador'] || fila['F'],
      unidadOperativa: fila['unidadOperativa'] || fila['E'],
      usuario: fila['usuario'] || fila['I'],
      cuenta: fila['cuenta'] || fila['J'],
      costos: {
        casetaCobro: parseNumber(fila['casetaCobro'] || fila['S']),
        casetaCubierta: fila['casetaCubierta'] || fila['T'],
        maniobras: parseNumber(fila['maniobras'] || fila['V']),
        horaEspera: parseNumber(fila['horaEspera'] || fila['W']),
        parking: parseNumber(fila['parking'] || fila['X']),
        otros: parseNumber(fila['otros'] || fila['Y']),
        excedente: parseNumber(fila['excedente'] || fila['Z']),
        topeCobertura: parseNumber(fila['topeCobertura'] || fila['AA']),
        costoTotal: parseNumber(fila['costoTotal'] || fila['AB']),
        resguardo: parseNumber(fila['resguardo'] || fila['U'])
      },
      servicio: {
        tipoRecorrido: fila['tipoRecorrido'] || fila['R'],
        distanciaRecorrido: parseNumber(fila['distanciaRecorrido'] || fila['AC']),
        tiempoRecorrido: parseNumber(fila['tiempoRecorrido'] || fila['AD']),
        tiempoArribo: parseNumber(fila['tiempoArribo'] || fila['AQ'])
      },
      grua: {
        placas: fila['placasGrua'] || fila['AE'],
        tipo: fila['tipoGrua'] || fila['AF'],
        ubicacion: fila['ubicacionGruaDin'] || fila['AH']
      },
      tiempos: {
        ta: fila['ta'] || fila['AJ'],
        tc: fila['tc'] || fila['AK'],
        tt: fila['tt'] || fila['AL'],
        tiempoArriboDin: fila['tiempoArriboDin'] || fila['AI']
      },
      serviciosEspeciales: {
        plano: fila['plano'] || fila['AM'],
        banderazo: fila['banderazo'] || fila['AN'],
        costoKm: parseNumber(fila['costoKm'] || fila['AO']),
        distanciaRecorridoED: parseNumber(fila['distanciaRecorridoED'] || fila['AP']),
        servicioMuertoED: fila['servicioMuertoED'] || fila['AR'],
        servicioMuertoBD: fila['servicioMuertoBD'] || fila['AS'],
        servicioMuertoBO: fila['servicioMuertoBO'] || fila['AT'],
        maniobrasAutorizadas: fila['maniobrasAutorizadas'] || fila['AU']
      }
    },
    
    // Metadatos para tracking
    metadatos: {
      ultimaActualizacion: new Date(),
      fuenteDatos: 'concentrado_general',
      version: '1.0.0',
      estadoGeneral: mapearEstado(fila['estatus'] || fila['K']),
      importadoDesdeConcentrado: true
    },
    
    // CRÍTICO: Contenedor para todos los valores originales del concentrado
    datosConcentrado: {}
  };
  
  // Preservar TODOS los valores originales en datosConcentrado
  for (const [columna, nombreCampo] of Object.entries(COLUMNAS_CONCENTRADO)) {
    // Intentar obtener el valor por diferentes medios
    let valor;
    
    if (fila[nombreCampo] !== undefined) {
      valor = fila[nombreCampo];
    } else if (fila[columna] !== undefined) {
      valor = fila[columna];
    } else {
      // Intentar por índice (A=0, B=1, etc.)
      try {
        if (columna.length === 1) {
          // Columnas A-Z
          const colIndex = columna.charCodeAt(0) - 65; // A=0, B=1, etc.
          valor = fila[colIndex];
        } else if (columna.length === 2) {
          // Columnas AA-AV
          const primerChar = columna.charCodeAt(0) - 65; // A=0
          const segundoChar = columna.charCodeAt(1) - 65; // A=0
          const indice = (primerChar + 1) * 26 + segundoChar;
          valor = fila[indice];
        }
      } catch (e) {
        // Si hay error al acceder por índice, dejarlo como undefined
      }
    }
    
    // Solo guardar valores definidos
    if (valor !== undefined) {
      documento.datosConcentrado[nombreCampo] = valor;
    }
  }
  
  return documento;
}

// Mapear estado original a valores estandarizados
function mapearEstado(estadoOriginal) {
  if (!estadoOriginal) return 'PENDIENTE';
  
  const estado = String(estadoOriginal).toUpperCase();
  
  if (estado.includes('COMPLET') || 
      estado.includes('FACTURA') || 
      estado.includes('PAGADO') || 
      estado.includes('FINALIZA')) {
    return 'COMPLETO';
  }
  
  if (estado.includes('PARCIAL') || 
      estado.includes('PROCESO') || 
      estado.includes('EN CURSO')) {
    return 'PARCIAL';
  }
  
  return 'PENDIENTE';
}

// Función principal para importar Excel a MongoDB
async function importarConcentradoAMongoDB(excelPath) {
  console.log(chalk.blue('\n=== IMPORTACIÓN DE CONCENTRADO GENERAL A MONGODB ==='));
  console.log(`Archivo Excel: ${excelPath}`);
  
  // Verificar que el archivo existe
  if (!fs.existsSync(excelPath)) {
    console.error(chalk.red(`❌ El archivo Excel no existe: ${excelPath}`));
    return false;
  }
  
  // Conectar a MongoDB
  const conexionExitosa = await conectarMongoDB();
  if (!conexionExitosa) return false;
  
  try {
    // Definir el esquema de Expediente
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
      collection: 'expedientes'
    });
    
    // Crear modelo
    const Expediente = mongoose.model('Expediente', expedienteSchema);
    
    // Leer el archivo Excel
    console.log(chalk.blue('\nLeyendo archivo Excel...'));
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    
    console.log(chalk.green(`✅ Excel leído correctamente. ${excelData.length} registros encontrados.`));
    
    // Estadísticas para el reporte
    const stats = {
      totalRegistros: excelData.length,
      procesados: 0,
      insertados: 0,
      actualizados: 0,
      errores: 0,
      expedientesConError: []
    };
    
    // Log detallado
    const logFile = path.join(__dirname, '..', 'logs', 'importacion_concentrado.log');
    const logDir = path.dirname(logFile);
    
    // Crear directorio de logs si no existe
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Crear/limpiar archivo de log
    fs.writeFileSync(logFile, `=== LOG DE IMPORTACIÓN: ${new Date().toISOString()} ===\n\n`);
    
    // Procesar registros en bloques para no sobrecargar memoria
    const tamanoBloque = 100;
    const totalBloques = Math.ceil(excelData.length / tamanoBloque);
    
    console.log(chalk.blue(`\nProcesando ${excelData.length} registros en ${totalBloques} bloques...`));
    
    for (let i = 0; i < totalBloques; i++) {
      const inicio = i * tamanoBloque;
      const fin = Math.min((i + 1) * tamanoBloque, excelData.length);
      const bloque = excelData.slice(inicio, fin);
      
      console.log(chalk.blue(`\nProcesando bloque ${i+1}/${totalBloques} (registros ${inicio+1}-${fin})...`));
      
      // Procesar registros del bloque
      for (const [index, fila] of bloque.entries()) {
        const posicionGlobal = inicio + index + 1;
        stats.procesados++;
        
        // Mapear fila a documento
        const documento = mapearFilaADocumento(fila);
        
        // Verificar si hubo error en el mapeo
        if (documento.error) {
          stats.errores++;
          stats.expedientesConError.push(`Fila ${posicionGlobal}: ${documento.error}`);
          
          // Registrar en log
          fs.appendFileSync(logFile, `ERROR - Fila ${posicionGlobal}: ${documento.error}\n`);
          continue;
        }
        
        try {
          // Buscar si ya existe el expediente
          const filtro = {
            numeroExpediente: documento.numeroExpediente,
            cliente: documento.cliente
          };
          
          // Contar campos originales
          const camposOriginales = Object.keys(documento.datosConcentrado).length;
          
          // Actualizar o insertar documento
          const resultado = await Expediente.findOneAndUpdate(
            filtro,
            // Usamos $set para actualizar solo los campos enviados sin borrar otros
            { 
              $set: {
                // Solo actualizar estos campos específicos
                'numeroExpediente': documento.numeroExpediente,
                'cliente': documento.cliente,
                'datos': documento.datos,
                'metadatos': documento.metadatos,
                'datosConcentrado': documento.datosConcentrado
              }
            },
            { 
              upsert: true, // Crear si no existe
              new: true,    // Devolver documento actualizado
              setDefaultsOnInsert: true // Usar valores default para nuevos docs
            }
          );
          
          // Determinar si fue inserción o actualización
          if (resultado.isNew) {
            stats.insertados++;
            
            // Log de inserción
            fs.appendFileSync(logFile, `INSERCIÓN - Expediente: ${documento.numeroExpediente}, Cliente: ${documento.cliente}, Campos: ${camposOriginales}\n`);
            
            // Mostrar progreso cada 100 registros o al final
            if (stats.procesados % 100 === 0 || stats.procesados === excelData.length) {
              console.log(chalk.green(`✅ Progreso: ${stats.procesados}/${excelData.length} (${Math.round((stats.procesados/excelData.length)*100)}%) - Insertados: ${stats.insertados}, Actualizados: ${stats.actualizados}, Errores: ${stats.errores}`));
            }
          } else {
            stats.actualizados++;
            
            // Log de actualización
            fs.appendFileSync(logFile, `ACTUALIZACIÓN - Expediente: ${documento.numeroExpediente}, Cliente: ${documento.cliente}, Campos: ${camposOriginales}\n`);
            
            // Mostrar progreso cada 100 registros o al final
            if (stats.procesados % 100 === 0 || stats.procesados === excelData.length) {
              console.log(chalk.green(`✅ Progreso: ${stats.procesados}/${excelData.length} (${Math.round((stats.procesados/excelData.length)*100)}%) - Insertados: ${stats.insertados}, Actualizados: ${stats.actualizados}, Errores: ${stats.errores}`));
            }
          }
        } catch (error) {
          stats.errores++;
          stats.expedientesConError.push(`Fila ${posicionGlobal}: ${error.message}`);
          
          // Registrar error en log
          fs.appendFileSync(logFile, `ERROR - Fila ${posicionGlobal}, Expediente ${documento.numeroExpediente}: ${error.message}\n`);
          
          console.error(chalk.red(`❌ Error al procesar fila ${posicionGlobal}:`, error.message));
        }
      }
    }
    
    // Mostrar reporte final
    console.log(chalk.blue('\n=== RESUMEN DE IMPORTACIÓN ==='));
    console.log(chalk.green(`Total registros en Excel: ${stats.totalRegistros}`));
    console.log(chalk.green(`Registros procesados: ${stats.procesados}`));
    console.log(chalk.green(`Expedientes insertados: ${stats.insertados}`));
    console.log(chalk.green(`Expedientes actualizados: ${stats.actualizados}`));
    console.log(chalk.yellow(`Errores encontrados: ${stats.errores}`));
    
    // Mostrar errores si hubo
    if (stats.errores > 0) {
      console.log(chalk.yellow('\nExpedientes con error (primeros 10):'));
      stats.expedientesConError.slice(0, 10).forEach(error => {
        console.log(chalk.yellow(`- ${error}`));
      });
      
      if (stats.expedientesConError.length > 10) {
        console.log(chalk.yellow(`... y ${stats.expedientesConError.length - 10} más. Ver log completo en: ${logFile}`));
      }
    }
    
    // Verificar integridad de los datos importados
    console.log(chalk.blue('\nVerificando integridad de datos...'));
    await verificarIntegridadImportacion(Expediente);
    
    console.log(chalk.green('\n✅ Importación completada.'));
    console.log(chalk.blue(`Log completo disponible en: ${logFile}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Error durante la importación:'), error);
    return false;
  } finally {
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log(chalk.blue('\nConexión a MongoDB cerrada.'));
  }
}

// Verificar integridad de la importación
async function verificarIntegridadImportacion(Expediente) {
  try {
    // 1. Contar documentos con datosConcentrado
    const totalConDatosConcentrado = await Expediente.countDocuments({
      'datosConcentrado': { $exists: true, $ne: {} }
    });
    
    // 2. Contar total de documentos
    const totalDocumentos = await Expediente.countDocuments();
    
    // 3. Verificar documentos con más campos originales
    const maxCampos = await Expediente.aggregate([
      { $match: { 'datosConcentrado': { $exists: true } } },
      { $project: { 
        _id: 0, 
        numeroExpediente: 1,
        camposOriginales: { $size: { $objectToArray: "$datosConcentrado" } }
      }},
      { $sort: { camposOriginales: -1 } },
      { $limit: 1 }
    ]);
    
    console.log(chalk.green(`Documentos con datos del concentrado: ${totalConDatosConcentrado}/${totalDocumentos} (${Math.round((totalConDatosConcentrado/totalDocumentos)*100)}%)`));
    
    if (maxCampos.length > 0) {
      console.log(chalk.green(`Máximo de campos originales en un documento: ${maxCampos[0].camposOriginales} (expediente: ${maxCampos[0].numeroExpediente})`));
    }
    
    // 4. Verificar campos específicos importantes
    const camposImportantes = ['numero', 'fechaRegistro', 'tipoServicio', 'distanciaRecorrido'];
    
    for (const campo of camposImportantes) {
      const conCampo = await Expediente.countDocuments({
        [`datosConcentrado.${campo}`]: { $exists: true }
      });
      
      console.log(chalk.green(`Documentos con campo '${campo}': ${conCampo}/${totalConDatosConcentrado} (${Math.round((conCampo/totalConDatosConcentrado)*100)}%)`));
    }
    
    // 5. Verificar relación con pedidos
    const conPedidos = await Expediente.countDocuments({
      'pedidos.0': { $exists: true }
    });
    
    const conPedidosYConcentrado = await Expediente.countDocuments({
      'pedidos.0': { $exists: true },
      'datosConcentrado': { $exists: true, $ne: {} }
    });
    
    console.log(chalk.green(`Documentos con pedidos: ${conPedidos}/${totalDocumentos} (${Math.round((conPedidos/totalDocumentos)*100)}%)`));
    console.log(chalk.green(`Documentos con pedidos y datos del concentrado: ${conPedidosYConcentrado}/${conPedidos} (${Math.round((conPedidosYConcentrado/conPedidos)*100)}%)`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error verificando integridad:'), error);
  }
}

// Ejecutar importación
const excelPath = process.argv[2] || path.join(process.env.HOME, 'Desktop', 'concentrado-crk', 'concentrado-general.xlsx');

importarConcentradoAMongoDB(excelPath)
  .then(exito => {
    process.exit(exito ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });

export { importarConcentradoAMongoDB };