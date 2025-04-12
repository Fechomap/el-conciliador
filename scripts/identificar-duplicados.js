#!/usr/bin/env node
/**
 * Script para identificar duplicados en el Excel basados en numeroExpediente+cliente
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import chalk from 'chalk';

// Configuración de __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta por defecto al Excel del concentrado
const defaultExcelPath = process.argv[2] || path.join(process.env.HOME, 'Desktop', 'concentrado-crk', 'concentrado-general.xlsx');

// Función para normalizar número de expediente
function normalizeExpediente(expediente) {
  if (!expediente) return '';
  const expStr = String(expediente).replace(/[^0-9]/g, '');
  return expStr.padStart(8, '0');
}

// Función para normalizar cliente (mayúsculas, sin espacios)
function normalizeCliente(cliente) {
  if (!cliente) return '';
  return String(cliente).replace(/\s+/g, '').toUpperCase();
}

async function identificarDuplicados(excelPath) {
  console.log(chalk.blue(`\n=== IDENTIFICANDO DUPLICADOS EN EXCEL ===`));
  console.log(`Archivo Excel: ${excelPath}`);
  
  try {
    // Verificar que existe el archivo
    if (!fs.existsSync(excelPath)) {
      console.error(chalk.red(`❌ El archivo Excel no existe: ${excelPath}`));
      return;
    }
    
    // Leer el archivo Excel
    console.log(chalk.blue(`\nLeyendo archivo Excel...`));
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    
    console.log(chalk.green(`✅ Excel leído correctamente. ${excelData.length} registros encontrados.`));
    
    // Analizar registros para encontrar duplicados
    console.log(chalk.blue(`\nAnalizando registros para encontrar duplicados...`));
    
    // Mapa para guardar expedientes únicos
    const expedientesUnicos = new Map();
    const duplicados = [];
    
    for (const [index, fila] of excelData.entries()) {
      // Obtener número de expediente y cliente
      const numeroExpediente = normalizeExpediente(fila['numero'] || fila['A'] || fila[0]);
      const cliente = normalizeCliente(fila['cliente'] || fila['B'] || fila[1]);
      
      if (!numeroExpediente) {
        console.log(chalk.yellow(`⚠️ Registro #${index+1} sin número de expediente válido. Omitiendo...`));
        continue;
      }
      
      // Crear clave única
      const claveUnica = `${numeroExpediente}:${cliente}`;
      
      // Verificar si ya existe
      if (expedientesUnicos.has(claveUnica)) {
        duplicados.push({
          indice: index + 1,
          numeroExpediente,
          cliente,
          claveUnica,
          registroOriginal: expedientesUnicos.get(claveUnica).indice
        });
      } else {
        expedientesUnicos.set(claveUnica, {
          indice: index + 1,
          numeroExpediente,
          cliente
        });
      }
    }
    
    // Mostrar resultados
    console.log(chalk.blue(`\n=== RESULTADOS DEL ANÁLISIS ===`));
    console.log(`Total de registros en Excel: ${excelData.length}`);
    console.log(`Registros únicos: ${expedientesUnicos.size}`);
    console.log(`Duplicados encontrados: ${duplicados.length}`);
    
    if (duplicados.length > 0) {
      console.log(chalk.yellow(`\n=== LISTA DE DUPLICADOS ===`));
      console.log(chalk.yellow(`Formato: [Fila] - Expediente:Cliente (duplicado de fila original)`));
      
      // Agrupar duplicados por expediente para mejor visualización
      const duplicadosPorExpediente = {};
      
      for (const dup of duplicados) {
        if (!duplicadosPorExpediente[dup.numeroExpediente]) {
          duplicadosPorExpediente[dup.numeroExpediente] = [];
        }
        duplicadosPorExpediente[dup.numeroExpediente].push(dup);
      }
      
      // Mostrar duplicados agrupados
      for (const [expediente, dups] of Object.entries(duplicadosPorExpediente)) {
        console.log(chalk.green(`\nExpediente ${expediente}:`));
        
        for (const dup of dups) {
          console.log(`  Fila ${dup.indice} - ${dup.numeroExpediente}:${dup.cliente} (duplicado de fila ${dup.registroOriginal})`);
        }
      }
      
      // Explicación de la discrepancia
      console.log(chalk.blue(`\n=== EXPLICACIÓN DE LA DISCREPANCIA ===`));
      console.log(`La discrepancia entre ${excelData.length} registros en Excel y ${expedientesUnicos.size} documentos en MongoDB`);
      console.log(`se debe a los ${duplicados.length} duplicados identificados por clave única (numeroExpediente + cliente).`);
      console.log(`MongoDB automáticamente evita duplicados usando el índice único compuesto.`);
    } else {
      console.log(chalk.green(`\n✅ No se encontraron duplicados en el Excel.`));
    }
    
    return {
      totalRegistros: excelData.length,
      registrosUnicos: expedientesUnicos.size,
      duplicados: duplicados.length,
      listaDuplicados: duplicados
    };
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Error durante el análisis: ${error.message}`));
    console.error(error);
  }
}

// Ejecutar la función principal
identificarDuplicados(defaultExcelPath);