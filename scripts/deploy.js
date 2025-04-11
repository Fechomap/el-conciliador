/**
 * Script de despliegue para Heroku
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

console.log("=== PREPARANDO DESPLIEGUE EN HEROKU ===");

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
  
  // Crear archivo .gitkeep para que Heroku preserva la carpeta
  fs.writeFileSync(path.join(fullPath, '.gitkeep'), '');
}

// 2. Verificar archivo .env
const envPath = path.join(ROOT_DIR, '.env');
if (!fs.existsSync(envPath)) {
  console.log("Creando archivo .env con valores por defecto");
  
  const envContent = `
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/database
  `.trim();
  
  fs.writeFileSync(envPath, envContent);
  console.log("⚠️ IMPORTANTE: Actualice las variables en .env antes de desplegar");
}

// 3. Verificar Procfile para Heroku
const procfilePath = path.join(ROOT_DIR, 'Procfile');
if (!fs.existsSync(procfilePath)) {
  console.log("Creando Procfile para Heroku");
  
  const procfileContent = `web: node web/server/app.js`;
  
  fs.writeFileSync(procfilePath, procfileContent);
}

// 4. Construir el frontend
console.log("Construyendo frontend...");
try {
  execSync('cd web/client && npm run build', { stdio: 'inherit' });
  console.log("✅ Frontend construido exitosamente");
} catch (error) {
  console.error("❌ Error al construir el frontend:", error);
  process.exit(1);
}

// 5. Ejecutar despliegue en Heroku
console.log("\n=== INICIANDO DESPLIEGUE EN HEROKU ===");
try {
  // Desplegar en Heroku
  execSync('git push heroku main', { stdio: 'inherit' });
  console.log("✅ ¡Despliegue exitoso!");
} catch (error) {
  console.error("❌ Error durante el despliegue:", error);
  process.exit(1);
}

console.log("\n=== VERIFICACIÓN POST-DESPLIEGUE ===");
try {
  // Mostrar logs de Heroku
  execSync('heroku logs --tail', { stdio: 'inherit' });
} catch (error) {
  console.error("No se pudieron obtener los logs de Heroku:", error);
}