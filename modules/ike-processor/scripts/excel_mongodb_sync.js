/**
 * Script para sincronización bidireccional entre MongoDB y Excel
 * 
 * Este script permite:
 * 1. Exportar datos desde MongoDB a Excel (reverse-sync)
 * 2. Comparar datos de Excel con MongoDB para detectar cambios
 * 3. Generar reportes de diferencias entre ambas fuentes
 */

import * as dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { PythonShell } from 'python-shell';
import { connectToDatabase, mongoose } from '../../../core/db/connection.js';
import Expediente from '../../../core/db/models/expediente.js';
import { Log } from '../../../core/db/models/log.js';
import { normalizeExpediente, normalizePedido } from '../../../core/concentrador/utils/normalizers.js';

// Rutas de archivos
const DEFAULT_EXCEL_PATH = path.join(process.cwd(), 'output', 'data.xlsx');
const TEMP_OUTPUT_PATH = path.join(process.cwd(), 'output', 'temp');
const LOG_FILE = path.join(process.cwd(), 'output', 'sync_log.txt');

// Asegurar que existan las carpetas
fs.mkdirSync(path.dirname(DEFAULT_EXCEL_PATH), { recursive: true });
fs.mkdirSync(TEMP_OUTPUT_PATH, { recursive: true });

/**
 * Exporta datos de MongoDB a Excel (reverse-sync)
 * @param {String} outputPath - Ruta del archivo Excel a generar
 */
async function exportToExcel(outputPath = DEFAULT_EXCEL_PATH) {
  console.log('=== EXPORTANDO DATOS DE MONGODB A EXCEL ===');
  
  try {
    // Conectar a MongoDB
    await connectToDatabase();
    console.log('✅ Conexión a MongoDB establecida');
    
    // Obtener expedientes de MongoDB
    console.log('Consultando expedientes en MongoDB...');
    const expedientes = await Expediente.find().lean();
    console.log(`✅ Encontrados ${expedientes.length} expedientes`);
    
    if (expedientes.length === 0) {
      console.log('⚠️ No hay expedientes para exportar');
      await mongoose.connection.close();
      return;
    }
    
    // Transformar a formato Excel
    console.log('Transformando datos al formato Excel...');
    const excelRows = [];
    
    for (const expediente of expedientes) {
      // Para cada pedido en el expediente, crear una fila
      if (expediente.pedidos && expediente.pedidos.length > 0) {
        for (const pedido of expediente.pedidos) {
          excelRows.push({
            'Nº de pieza': expediente.numeroExpediente,
            'Numero de Pedido': pedido.numeroPedido,
            'Numero de linea': pedido.numeroLinea || 1,
            'Descripcion': expediente.datos?.descripcion || 'Servicio',
            'Tipo': expediente.datos?.tipoServicio || 'ARRASTRE',
            'Fecha': expediente.datos?.fechaCreacion 
              ? formatDate(expediente.datos.fechaCreacion) 
              : formatDate(new Date()),
            'Precio por unidad': formatCurrency(pedido.precio),
            'Subtotal': formatCurrency(pedido.precio),
            'Impuesto': formatCurrency(pedido.precio * 0.16),
            'Status': pedido.estatus || 'NO FACTURADO',
            'No factura': pedido.factura || ''
          });
        }
      } else {
        // Si no hay pedidos, crear una fila básica
        excelRows.push({
          'Nº de pieza': expediente.numeroExpediente,
          'Numero de Pedido': '',
          'Numero de linea': 1,
          'Descripcion': expediente.datos?.descripcion || 'Servicio',
          'Tipo': expediente.datos?.tipoServicio || 'ARRASTRE',
          'Fecha': expediente.datos?.fechaCreacion 
            ? formatDate(expediente.datos.fechaCreacion) 
            : formatDate(new Date()),
          'Precio por unidad': '',
          'Subtotal': '',
          'Impuesto': '',
          'Status': expediente.metadatos?.facturado ? 'FACTURADO' : 'NO FACTURADO',
          'No factura': ''
        });
      }
    }
    
    // Crear libro Excel
    console.log(`Creando archivo Excel con ${excelRows.length} filas...`);
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelRows);
    
    // Ajustar ancho de columnas
    const columnsWidth = [
      { wch: 10 },  // Nº de pieza
      { wch: 12 },  // Numero de Pedido
      { wch: 8 },   // Numero de linea
      { wch: 30 },  // Descripcion
      { wch: 10 },  // Tipo
      { wch: 12 },  // Fecha
      { wch: 12 },  // Precio por unidad
      { wch: 12 },  // Subtotal
      { wch: 12 },  // Impuesto
      { wch: 20 },  // Status
      { wch: 15 }   // No factura
    ];
    
    worksheet['!cols'] = columnsWidth;
    
    // Agregar hoja al libro
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Expedientes');
    
    // Guardar archivo
    xlsx.writeFile(workbook, outputPath);
    console.log(`✅ Archivo Excel guardado en: ${outputPath}`);
    
    // Registrar operación en logs
    await Log.create({
      timestamp: new Date(),
      operacion: 'exportacion_mongodb_excel',
      cliente: 'SISTEMA',
      detalles: {
        expedientesExportados: expedientes.length,
        filasGeneradas: excelRows.length,
        archivoSalida: outputPath
      }
    });
    
    console.log('✅ Exportación completada exitosamente');
    
    // Cerrar conexión
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error durante la exportación:');
    console.error(error);
    
    // Intentar cerrar conexión
    try {
      await mongoose.connection.close();
    } catch (err) {}
  }
}

/**
 * Compara datos entre Excel y MongoDB y genera informe de diferencias
 * @param {String} excelPath - Ruta del archivo Excel a comparar
 */
async function compareExcelWithMongoDB(excelPath = DEFAULT_EXCEL_PATH) {
  console.log('=== COMPARANDO EXCEL CON MONGODB ===');
  
  try {
    // Verificar que existe el archivo Excel
    if (!fs.existsSync(excelPath)) {
      console.error(`❌ El archivo Excel no existe: ${excelPath}`);
      return;
    }
    
    // Conectar a MongoDB
    await connectToDatabase();
    console.log('✅ Conexión a MongoDB establecida');
    
    // Leer datos de Excel
    console.log(`Leyendo archivo Excel: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = xlsx.utils.sheet_to_json(worksheet);
    console.log(`✅ Leídos ${excelData.length} registros del Excel`);
    
    // Obtener expedientes de MongoDB
    console.log('Consultando expedientes en MongoDB...');
    const expedientes = await Expediente.find().lean();
    console.log(`✅ Encontrados ${expedientes.length} expedientes en MongoDB`);
    
    // Preparar estructuras para comparación
    const excelExpedientes = new Map();
    const excelPedidos = new Map();
    
    // Mapear datos de Excel
    for (const row of excelData) {
      const numeroExpediente = normalizeExpediente(row['Nº de pieza']);
      const numeroPedido = normalizePedido(row['Numero de Pedido']);
      
      // Agregar a mapa de expedientes
      if (numeroExpediente) {
        excelExpedientes.set(numeroExpediente, true);
      }
      
      // Agregar a mapa de pedidos
      if (numeroPedido) {
        excelPedidos.set(numeroPedido, {
          expediente: numeroExpediente,
          estatus: row['Status'],
          factura: row['No factura']
        });
      }
    }
    
    // Mapear datos de MongoDB
    const mongoExpedientes = new Map();
    const mongoPedidos = new Map();
    
    for (const expediente of expedientes) {
      mongoExpedientes.set(expediente.numeroExpediente, expediente);
      
      // Mapear pedidos
      if (expediente.pedidos && expediente.pedidos.length > 0) {
        for (const pedido of expediente.pedidos) {
          mongoPedidos.set(pedido.numeroPedido, {
            expediente: expediente.numeroExpediente,
            estatus: pedido.estatus,
            factura: pedido.factura
          });
        }
      }
    }
    
    // Análisis de diferencias
    console.log('\n=== ANÁLISIS DE DIFERENCIAS ===');
    
    // 1. Expedientes en Excel que no están en MongoDB
    const expedientesNuevos = [];
    for (const numeroExpediente of excelExpedientes.keys()) {
      if (!mongoExpedientes.has(numeroExpediente)) {
        expedientesNuevos.push(numeroExpediente);
      }
    }
    
    // 2. Expedientes en MongoDB que no están en Excel
    const expedientesFaltantes = [];
    for (const numeroExpediente of mongoExpedientes.keys()) {
      if (!excelExpedientes.has(numeroExpediente)) {
        expedientesFaltantes.push(numeroExpediente);
      }
    }
    
    // 3. Pedidos en Excel que no están en MongoDB
    const pedidosNuevos = [];
    for (const [numeroPedido, datos] of excelPedidos.entries()) {
      if (!mongoPedidos.has(numeroPedido)) {
        pedidosNuevos.push({ numeroPedido, ...datos });
      }
    }
    
    // 4. Pedidos en MongoDB que no están en Excel
    const pedidosFaltantes = [];
    for (const [numeroPedido, datos] of mongoPedidos.entries()) {
      if (!excelPedidos.has(numeroPedido)) {
        pedidosFaltantes.push({ numeroPedido, ...datos });
      }
    }
    
    // 5. Diferencias en estado o factura entre pedidos
    const pedidosDiferentes = [];
    for (const [numeroPedido, datosMongo] of mongoPedidos.entries()) {
      if (excelPedidos.has(numeroPedido)) {
        const datosExcel = excelPedidos.get(numeroPedido);
        
        // Verificar diferencias
        if (datosMongo.estatus !== datosExcel.estatus || 
            datosMongo.factura !== datosExcel.factura) {
          pedidosDiferentes.push({
            numeroPedido,
            expediente: datosMongo.expediente,
            mongo: {
              estatus: datosMongo.estatus,
              factura: datosMongo.factura
            },
            excel: {
              estatus: datosExcel.estatus,
              factura: datosExcel.factura
            }
          });
        }
      }
    }
    
    // Mostrar resultados
    console.log(`\nExpedientes nuevos en Excel: ${expedientesNuevos.length}`);
    if (expedientesNuevos.length > 0) {
      console.log(expedientesNuevos.slice(0, 10).join(', ') + 
                 (expedientesNuevos.length > 10 ? '...' : ''));
    }
    
    console.log(`\nExpedientes faltantes en Excel: ${expedientesFaltantes.length}`);
    if (expedientesFaltantes.length > 0) {
      console.log(expedientesFaltantes.slice(0, 10).join(', ') + 
                 (expedientesFaltantes.length > 10 ? '...' : ''));
    }
    
    console.log(`\nPedidos nuevos en Excel: ${pedidosNuevos.length}`);
    if (pedidosNuevos.length > 0) {
      console.log(pedidosNuevos.slice(0, 5).map(p => p.numeroPedido).join(', ') + 
                 (pedidosNuevos.length > 5 ? '...' : ''));
    }
    
    console.log(`\nPedidos faltantes en Excel: ${pedidosFaltantes.length}`);
    if (pedidosFaltantes.length > 0) {
      console.log(pedidosFaltantes.slice(0, 5).map(p => p.numeroPedido).join(', ') + 
                 (pedidosFaltantes.length > 5 ? '...' : ''));
    }
    
    console.log(`\nPedidos con diferencias: ${pedidosDiferentes.length}`);
    if (pedidosDiferentes.length > 0) {
      console.log(JSON.stringify(pedidosDiferentes.slice(0, 3), null, 2) + 
                 (pedidosDiferentes.length > 3 ? '...' : ''));
    }
    
    // Generar informe
    const report = {
      fechaAnalisis: new Date(),
      expedientesExcel: excelExpedientes.size,
      expedientesMongoDB: mongoExpedientes.size,
      pedidosExcel: excelPedidos.size,
      pedidosMongoDB: mongoPedidos.size,
      diferencias: {
        expedientesNuevos,
        expedientesFaltantes,
        pedidosNuevos,
        pedidosFaltantes,
        pedidosDiferentes
      }
    };
    
    // Guardar informe
    const reportPath = path.join(TEMP_OUTPUT_PATH, `comparison_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Informe de diferencias guardado en: ${reportPath}`);
    
    // Registrar operación en logs
    await Log.create({
      timestamp: new Date(),
      operacion: 'comparacion_excel_mongodb',
      cliente: 'SISTEMA',
      detalles: {
        expedientesExcel: excelExpedientes.size,
        expedientesMongoDB: mongoExpedientes.size,
        diferenciasExpedientes: expedientesNuevos.length + expedientesFaltantes.length,
        diferenciasPedidos: pedidosNuevos.length + pedidosFaltantes.length + pedidosDiferentes.length,
        reportePath: reportPath
      }
    });
    
    // Cerrar conexión
    await mongoose.connection.close();
    
    return report;
    
  } catch (error) {
    console.error('❌ Error durante la comparación:');
    console.error(error);
    
    // Intentar cerrar conexión
    try {
      await mongoose.connection.close();
    } catch (err) {}
    
    return null;
  }
}

/**
 * Importa datos del Excel a MongoDB usando el script Python
 * @param {String} excelPath - Ruta del archivo Excel a importar
 */
async function importExcelToMongoDB(excelPath = DEFAULT_EXCEL_PATH) {
  console.log('=== IMPORTANDO EXCEL A MONGODB ===');
  
  return new Promise((resolve, reject) => {
    // Verificar que existe el archivo Excel
    if (!fs.existsSync(excelPath)) {
      console.error(`❌ El archivo Excel no existe: ${excelPath}`);
      return reject(new Error(`El archivo Excel no existe: ${excelPath}`));
    }
    
    // Opciones para PythonShell
    const options = {
      mode: 'text',
      pythonPath: 'python3',
      pythonOptions: ['-u'], // unbuffered
      scriptPath: path.join(process.cwd(), 'modules', 'ike-processor', 'scripts'),
      args: [
        excelPath,
        '--log_file', LOG_FILE
      ]
    };
    
    // Si hay URI de MongoDB en variables de entorno, añadirla
    if (process.env.MONGODB_URI) {
      options.args.push('--uri', process.env.MONGODB_URI);
    }
    
    // Si hay nombre de base de datos, añadirlo
    if (process.env.MONGODB_DB_NAME) {
      options.args.push('--db', process.env.MONGODB_DB_NAME);
    }
    
    console.log(`Ejecutando script Python con archivo: ${excelPath}`);
    
    // Ejecutar script Python
    PythonShell.run('export_mongodb.py', options, (err, results) => {
      if (err) {
        console.error('❌ Error al ejecutar script Python:');
        console.error(err);
        return reject(err);
      }
      
      // Mostrar resultados
      console.log('Salida del script Python:');
      results.forEach(line => console.log(line));
      
      console.log('✅ Importación completada exitosamente');
      resolve(results);
    });
  });
}

/**
 * Sincronización completa (bidireccional) entre Excel y MongoDB
 * @param {String} excelPath - Ruta del archivo Excel
 */
async function fullSync(excelPath = DEFAULT_EXCEL_PATH) {
  console.log('=== SINCRONIZACIÓN BIDIRECCIONAL EXCEL-MONGODB ===');
  
  try {
    // 1. Importar Excel a MongoDB
    console.log('\n=== PASO 1: IMPORTAR EXCEL A MONGODB ===');
    await importExcelToMongoDB(excelPath);
    
    // 2. Comparar datos
    console.log('\n=== PASO 2: COMPARAR DATOS ===');
    const comparisonReport = await compareExcelWithMongoDB(excelPath);
    
    // 3. Exportar MongoDB a Excel (actualizando el original)
    console.log('\n=== PASO 3: EXPORTAR MONGODB A EXCEL ===');
    
    // Crear copia de seguridad del Excel original
    const backupPath = `${excelPath}.backup.${Date.now()}.xlsx`;
    fs.copyFileSync(excelPath, backupPath);
    console.log(`✅ Copia de seguridad del Excel creada: ${backupPath}`);
    
    // Exportar a un archivo temporal
    const tempExcelPath = path.join(TEMP_OUTPUT_PATH, `temp_export_${Date.now()}.xlsx`);
    await exportToExcel(tempExcelPath);
    
    // 4. Finalizar
    console.log('\n=== SINCRONIZACIÓN COMPLETADA ===');
    console.log(`✅ Excel original: ${excelPath}`);
    console.log(`✅ Backup: ${backupPath}`);
    console.log(`✅ Versión actualizada desde MongoDB: ${tempExcelPath}`);
    
    if (comparisonReport) {
      console.log('\n=== RESUMEN DE DIFERENCIAS ===');
      console.log(`Expedientes solo en Excel: ${comparisonReport.diferencias.expedientesNuevos.length}`);
      console.log(`Expedientes solo en MongoDB: ${comparisonReport.diferencias.expedientesFaltantes.length}`);
      console.log(`Pedidos solo en Excel: ${comparisonReport.diferencias.pedidosNuevos.length}`);
      console.log(`Pedidos solo en MongoDB: ${comparisonReport.diferencias.pedidosFaltantes.length}`);
      console.log(`Pedidos con diferencias: ${comparisonReport.diferencias.pedidosDiferentes.length}`);
    }
    
    return {
      originalPath: excelPath,
      backupPath,
      updatedPath: tempExcelPath,
      comparisonReport
    };
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:');
    console.error(error);
    return null;
  }
}

// Funciones de utilidad
function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
  if (!value || isNaN(value)) return '';
  
  const num = parseFloat(value);
  return num.toFixed(2);
}

// Exportar funciones
export {
  exportToExcel,
  importExcelToMongoDB,
  compareExcelWithMongoDB,
  fullSync
};

// Ejecutar directamente si se llama como script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const excelPath = args[1] || DEFAULT_EXCEL_PATH;
  
  switch (command) {
    case 'export':
      exportToExcel(excelPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'import':
      importExcelToMongoDB(excelPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'compare':
      compareExcelWithMongoDB(excelPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'sync':
      fullSync(excelPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'help':
    default:
      console.log(`
Sincronización bidireccional Excel-MongoDB

Uso:
  node excel_mongodb_sync.js <comando> [ruta-excel]

Comandos:
  export   Exporta datos de MongoDB a Excel
  import   Importa datos de Excel a MongoDB
  compare  Compara datos entre Excel y MongoDB
  sync     Realiza una sincronización completa (bidireccional)
  help     Muestra esta ayuda

Ejemplos:
  node excel_mongodb_sync.js export output/data.xlsx
  node excel_mongodb_sync.js import output/data.xlsx
  node excel_mongodb_sync.js compare output/data.xlsx
  node excel_mongodb_sync.js sync output/data.xlsx
      `);
      process.exit(0);
  }
}