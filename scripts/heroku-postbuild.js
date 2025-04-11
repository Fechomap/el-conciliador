/**
 * Script ejecutado después del despliegue en Heroku
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, mongoose } from '../core/db/connection.js';

// Configurar __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

console.log("=== CONFIGURACIÓN POST-DESPLIEGUE EN HEROKU ===");

// 1. Verificar y crear carpetas necesarias
const requiredDirs = [
  'PDF-PEDIDOS',
  'PDF-FACTURAS',
  'output',
  'output/logs'
];

for (const dir of requiredDirs) {
  const fullPath = path.join(ROOT_DIR, dir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Creando directorio: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

// 2. Verificar conexión a MongoDB
async function checkMongoDB() {
  try {
    console.log("Verificando conexión a MongoDB...");
    await connectToDatabase();
    console.log("✅ Conexión a MongoDB establecida");
    
    // Verificar que las colecciones existan
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log("Colecciones encontradas:", collectionNames.join(', '));
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log("Conexión a MongoDB cerrada");
    
    return true;
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error.message);
    return false;
  }
}

// 3. Crear archivo de ejemplo
function createExampleFile() {
  const examplePath = path.join(ROOT_DIR, 'PDF-PEDIDOS', 'README.txt');
  
  const exampleContent = `
=== CARPETA DE PEDIDOS ===

Coloque aquí los archivos PDF de pedidos de compra para ser procesados.

Los archivos deben estar en formato PDF y contener información de pedidos.
  `.trim();
  
  fs.writeFileSync(examplePath, exampleContent);
  console.log("✅ Archivo de ejemplo creado en PDF-PEDIDOS");
  
  // También para facturas
  const examplePath2 = path.join(ROOT_DIR, 'PDF-FACTURAS', 'README.txt');
  
  const exampleContent2 = `
=== CARPETA DE FACTURAS ===

Coloque aquí los archivos PDF de facturas para ser procesados.

Los archivos deben estar en formato PDF y contener información de facturas.
  `.trim();
  
  fs.writeFileSync(examplePath2, exampleContent2);
  console.log("✅ Archivo de ejemplo creado en PDF-FACTURAS");
}

// Ejecutar todo
async function main() {
  createExampleFile();
  await checkMongoDB();
  console.log("=== CONFIGURACIÓN POST-DESPLIEGUE COMPLETADA ===");
}

main().catch(error => {
  console.error("Error en configuración post-despliegue:", error);
  process.exit(1);
});