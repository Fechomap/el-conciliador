#!/usr/bin/env node
/**
 * Script para Importar el Concentrado General a MongoDB (Validación Exacta sin normalización)
 *
 * Este script:
 * 1. Lee el archivo Excel del Concentrado General.
 * 2. Mapea todas las columnas (A-AV) a la estructura de MongoDB, sin transformar (validación exacta).
 * 3. Para cada registro, verifica si ya existe en MongoDB (filtrado por "numeroExpediente" y "cliente").
 *    - Si existe y es exactamente igual (usando JSON.stringify), se omite la actualización.
 *    - Si existe pero es diferente, se actualiza.
 *    - Si no existe, se inserta.
 * 4. Genera un reporte del proceso.
 *
 * Uso:
 *   node scripts/importar-concentrado
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Configuración de __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);
let excelPath = args[0] || path.join(process.env.HOME, 'Desktop', 'CONCENTRADO-CRK', 'concentrado-general.xlsx');

console.log(chalk.blue('Modo: VALIDACIÓN EXACTA (sin normalización)'));

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

// Función identity: devuelve el valor tal cual (para validación exacta)
function identity(value) {
  return String(value);
}

// Se forzará el uso de identity para ambos campos, sin normalización.
const normalizarExpediente = identity;
const normalizarCliente = identity;

// Función para convertir una fecha (sin cambios)
function parseDate(excelDate) {
  if (!excelDate) return null;
  if (excelDate instanceof Date && !isNaN(excelDate.getTime())) return excelDate;
  try {
    if (typeof excelDate === 'number') {
      return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    }
    const parsedDate = new Date(excelDate);
    if (!isNaN(parsedDate.getTime())) return parsedDate;
    return null;
  } catch (e) {
    return null;
  }
}

// Función para convertir un valor a número (sin cambios)
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  try {
    const cleaned = String(value).replace(/[$,\s]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch (e) {
    return null;
  }
}

// Mapear una fila del Excel a un documento de MongoDB (sin normalización)
function mapearFilaADocumento(fila) {
  const numeroExpediente = normalizarExpediente(fila['numero'] || fila['A'] || fila[0]);
  const cliente = normalizarCliente(fila['cliente'] || fila['B'] || fila[1]);
  
  if (!numeroExpediente) {
    return { error: 'Fila sin número de expediente válido' };
  }
  
  const documento = {
    numeroExpediente,
    cliente: cliente || 'DESCONOCIDO',
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
    metadatos: {
      ultimaActualizacion: new Date(),
      fuenteDatos: 'concentrado_general',
      version: '1.0.0',
      estadoGeneral: mapearEstado(fila['estatus'] || fila['K']),
      importadoDesdeConcentrado: true
    },
    datosConcentrado: {}
  };
  
  // Preservar todos los valores originales en datosConcentrado
  for (const [columna, nombreCampo] of Object.entries(COLUMNAS_CONCENTRADO)) {
    let valor;
    if (fila[nombreCampo] !== undefined) {
      valor = fila[nombreCampo];
    } else if (fila[columna] !== undefined) {
      valor = fila[columna];
    } else {
      try {
        if (columna.length === 1) {
          const colIndex = columna.charCodeAt(0) - 65;
          valor = fila[colIndex];
        } else if (columna.length === 2) {
          const primerChar = columna.charCodeAt(0) - 65;
          const segundoChar = columna.charCodeAt(1) - 65;
          const indice = (primerChar + 1) * 26 + segundoChar;
          valor = fila[indice];
        }
      } catch (e) {
        // Si hay error al acceder por índice, dejarlo como undefined.
      }
    }
    if (valor !== undefined) {
      documento.datosConcentrado[nombreCampo] = valor;
    }
  }
  
  return documento;
}

// Función para mapear estado original a valores estandarizados (sin cambios)
function mapearEstado(estadoOriginal) {
  if (!estadoOriginal) return 'PENDIENTE';
  const estado = String(estadoOriginal).toUpperCase();
  if (estado.includes('COMPLET') || estado.includes('FACTURA') || estado.includes('PAGADO') || estado.includes('FINALIZA')) {
    return 'COMPLETO';
  }
  if (estado.includes('PARCIAL') || estado.includes('PROCESO') || estado.includes('EN CURSO')) {
    return 'PARCIAL';
  }
  return 'PENDIENTE';
}

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

// Función principal para importar el Excel a MongoDB (sin normalización)
async function importarConcentradoAMongoDB(excelPath) {
  console.log(chalk.blue('\n=== IMPORTACIÓN DE CONCENTRADO GENERAL A MONGODB ==='));
  console.log(`Archivo Excel: ${excelPath}`);
  
  if (!fs.existsSync(excelPath)) {
    console.error(chalk.red(`❌ El archivo Excel no existe: ${excelPath}`));
    return false;
  }
  
  const conexionExitosa = await conectarMongoDB();
  if (!conexionExitosa) return false;
  
  try {
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
    
    const Expediente = mongoose.model('Expediente', expedienteSchema);
    
    console.log(chalk.blue('\nLeyendo archivo Excel...'));
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    
    console.log(chalk.green(`✅ Excel leído correctamente. ${excelData.length} registros encontrados.`));
    
    const stats = {
      totalRegistros: excelData.length,
      procesados: 0,
      insertados: 0,
      actualizados: 0,
      sinCambios: 0,
      errores: 0,
      expedientesConError: []
    };
    
    const logFile = path.join(__dirname, '..', 'logs', 'importacion_concentrado_exacto.log');
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(logFile, `=== LOG DE IMPORTACIÓN (EXACTO): ${new Date().toISOString()} ===\n\n`);
    
    const tamanoBloque = 100;
    const totalBloques = Math.ceil(excelData.length / tamanoBloque);
    
    console.log(chalk.blue(`\nProcesando ${excelData.length} registros en ${totalBloques} bloques...`));
    
    for (let i = 0; i < totalBloques; i++) {
      const inicio = i * tamanoBloque;
      const fin = Math.min((i + 1) * tamanoBloque, excelData.length);
      const bloque = excelData.slice(inicio, fin);
      
      console.log(chalk.blue(`\nProcesando bloque ${i+1}/${totalBloques} (registros ${inicio+1}-${fin})...`));
      
      for (const [index, fila] of bloque.entries()) {
        const posicionGlobal = inicio + index + 1;
        stats.procesados++;
        
        const documento = mapearFilaADocumento(fila);
        
        if (documento.error) {
          stats.errores++;
          stats.expedientesConError.push(`Fila ${posicionGlobal}: ${documento.error}`);
          fs.appendFileSync(logFile, `ERROR - Fila ${posicionGlobal}: ${documento.error}\n`);
          continue;
        }
        
        const filtro = {
          numeroExpediente: documento.numeroExpediente,
          cliente: documento.cliente
        };
        
        const camposOriginales = Object.keys(documento.datosConcentrado).length;
        
        // Buscar si ya existe un documento con el mismo filtro
        const docExistente = await Expediente.findOne(filtro).lean();
        if (docExistente) {
          // Crear objeto con los campos a comparar
          const newData = {
            numeroExpediente: documento.numeroExpediente,
            cliente: documento.cliente,
            datos: documento.datos,
            metadatos: documento.metadatos,
            datosConcentrado: documento.datosConcentrado
          };
          // Comparar con el documento existente (usando JSON.stringify para comparación exacta)
          if (JSON.stringify(docExistente.numeroExpediente) === JSON.stringify(newData.numeroExpediente) &&
              JSON.stringify(docExistente.cliente) === JSON.stringify(newData.cliente) &&
              JSON.stringify(docExistente.datos) === JSON.stringify(newData.datos) &&
              JSON.stringify(docExistente.metadatos) === JSON.stringify(newData.metadatos) &&
              JSON.stringify(docExistente.datosConcentrado) === JSON.stringify(newData.datosConcentrado)) {
            // Documento idéntico, no realizar actualización
            stats.sinCambios++;
            fs.appendFileSync(logFile, `SIN CAMBIOS - Expediente: ${documento.numeroExpediente}, Cliente: ${documento.cliente}\n`);
            continue;
          } else {
            // Documento existe pero difiere; realizar actualización
            const resultado = await Expediente.findOneAndUpdate(
              filtro,
              { 
                $set: {
                  numeroExpediente: documento.numeroExpediente,
                  cliente: documento.cliente,
                  datos: documento.datos,
                  metadatos: documento.metadatos,
                  datosConcentrado: documento.datosConcentrado
                }
              },
              { 
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
              }
            );
            if (resultado) {
              stats.actualizados++;
              fs.appendFileSync(logFile, `ACTUALIZACIÓN - Expediente: ${documento.numeroExpediente}, Cliente: ${documento.cliente}, Campos: ${camposOriginales}\n`);
            }
          }
        } else {
          // No existe, insertar nuevo
          const resultado = await Expediente.findOneAndUpdate(
            filtro,
            { 
              $set: {
                numeroExpediente: documento.numeroExpediente,
                cliente: documento.cliente,
                datos: documento.datos,
                metadatos: documento.metadatos,
                datosConcentrado: documento.datosConcentrado
              }
            },
            { 
              upsert: true,
              new: true,
              setDefaultsOnInsert: true
            }
          );
          if (resultado) {
            stats.insertados++;
            fs.appendFileSync(logFile, `INSERCIÓN - Expediente: ${documento.numeroExpediente}, Cliente: ${documento.cliente}, Campos: ${camposOriginales}\n`);
          }
        }
        
        if (stats.procesados % 100 === 0 || stats.procesados === excelData.length) {
          console.log(chalk.green(`✅ Progreso: ${stats.procesados}/${excelData.length} (${Math.round((stats.procesados/excelData.length)*100)}%) - Insertados: ${stats.insertados}, Actualizados: ${stats.actualizados}, Sin Cambios: ${stats.sinCambios}, Errores: ${stats.errores}`));
        }
      }
    }
    
    console.log(chalk.blue('\n=== RESUMEN DE IMPORTACIÓN ==='));
    console.log(chalk.green(`Total registros en Excel: ${stats.totalRegistros}`));
    console.log(chalk.green(`Registros procesados: ${stats.procesados}`));
    console.log(chalk.green(`Expedientes insertados: ${stats.insertados}`));
    console.log(chalk.green(`Expedientes actualizados: ${stats.actualizados}`));
    console.log(chalk.green(`Expedientes sin cambios: ${stats.sinCambios}`));
    console.log(chalk.yellow(`Errores encontrados: ${stats.errores}`));
    
    if (stats.errores > 0) {
      console.log(chalk.yellow('\nExpedientes con error (primeros 10):'));
      stats.expedientesConError.slice(0, 10).forEach(error => {
        console.log(chalk.yellow(`- ${error}`));
      });
      
      if (stats.expedientesConError.length > 10) {
        console.log(chalk.yellow(`... y ${stats.expedientesConError.length - 10} más. Ver log completo en: ${logFile}`));
      }
    }
    
    console.log(chalk.blue('\nVerificando integridad de datos...'));
    await verificarIntegridadImportacion(Expediente);
    
    console.log(chalk.green('\n✅ Importación completada.'));
    console.log(chalk.blue(`Log completo disponible en: ${logFile}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Error durante la importación:'), error);
    return false;
  } finally {
    await mongoose.connection.close();
    console.log(chalk.blue('\nConexión a MongoDB cerrada.'));
  }
}

// Verificar integridad de la importación
async function verificarIntegridadImportacion(Expediente) {
  try {
    const totalConDatosConcentrado = await Expediente.countDocuments({
      'datosConcentrado': { $exists: true, $ne: {} }
    });
    const totalDocumentos = await Expediente.countDocuments();
    
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
    
    const camposImportantes = ['numero', 'fechaRegistro', 'tipoServicio', 'distanciaRecorrido'];
    
    for (const campo of camposImportantes) {
      const conCampo = await Expediente.countDocuments({
        [`datosConcentrado.${campo}`]: { $exists: true }
      });
      
      console.log(chalk.green(`Documentos con campo '${campo}': ${conCampo}/${totalConDatosConcentrado} (${Math.round((conCampo/totalConDatosConcentrado)*100)}%)`));
    }
    
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
importarConcentradoAMongoDB(excelPath)
  .then(exito => {
    process.exit(exito ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });

export { importarConcentradoAMongoDB };