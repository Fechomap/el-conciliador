/**
 * Ruta: scripts/setup.js
 * 
 * Script para configurar el entorno de desarrollo
 * 
 * Este script:
 * 1. Verifica y crea las carpetas necesarias
 * 2. Verifica la existencia de dependencias
 * 3. Genera un archivo .env si no existe
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

// Configurar __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Color para log
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

/**
 * Verifica y crea las carpetas necesarias
 */
function setupDirectories() {
  console.log('\n=== CONFIGURANDO DIRECTORIOS ===');
  
  const directories = [
    path.join(ROOT_DIR, 'output'),
    path.join(ROOT_DIR, 'modules', 'ike-processor', 'PDF-PEDIDOS'),
    path.join(ROOT_DIR, 'modules', 'ike-processor', 'PDF-FACTURAS'),
    path.join(ROOT_DIR, 'modules', 'ike-processor', 'output'),
    path.join(ROOT_DIR, 'modules', 'ike-processor', 'output', 'logs')
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`${GREEN}✓ Carpeta creada: ${dir}${RESET}`);
    } else {
      console.log(`${YELLOW}- Carpeta ya existe: ${dir}${RESET}`);
    }
  }
  
  console.log(`${GREEN}✓ Estructura de directorios configurada correctamente${RESET}`);
}

/**
 * Verifica la existencia del archivo .env y lo crea si no existe
 */
function setupEnvFile() {
  console.log('\n=== CONFIGURANDO ARCHIVO .ENV ===');
  
  const envPath = path.join(ROOT_DIR, '.env');
  
  if (!fs.existsSync(envPath)) {
    const envContent = `# Variables de entorno para El Conciliador
# Configuración MongoDB
MONGODB_URI=mongodb+srv://<usuario>:<password>@<host>/<database>
MONGODB_DB_NAME=el_conciliador

# Puerto para el servidor
PORT=3000

# Entorno
NODE_ENV=development

# Configuración de logs
LOG_LEVEL=info
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${GREEN}✓ Archivo .env creado${RESET}`);
    console.log(`${YELLOW}⚠️ Recuerda completar los datos de conexión a MongoDB en el archivo .env${RESET}`);
  } else {
    console.log(`${YELLOW}- Archivo .env ya existe${RESET}`);
  }
}

/**
 * Verifica la instalación de dependencias
 */
function checkDependencies() {
  console.log('\n=== VERIFICANDO DEPENDENCIAS ===');
  
  // Verificar Node.js
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    console.log(`${GREEN}✓ Node.js instalado: ${nodeVersion}${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Error al verificar Node.js: ${error.message}${RESET}`);
  }
  
  // Verificar npm
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`${GREEN}✓ npm instalado: ${npmVersion}${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Error al verificar npm: ${error.message}${RESET}`);
  }
  
  // Verificar Python
  try {
    const pythonVersion = execSync('python3 --version').toString().trim();
    console.log(`${GREEN}✓ Python instalado: ${pythonVersion}${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Error al verificar Python: ${error.message}${RESET}`);
  }
  
  // Verificar pip
  try {
    const pipVersion = execSync('pip --version').toString().trim();
    console.log(`${GREEN}✓ pip instalado: ${pipVersion}${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Error al verificar pip: ${error.message}${RESET}`);
  }
  
  // Verificar dependencias de Node.js
  try {
    // Verificar si node_modules existe
    const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      console.log(`${YELLOW}⚠️ Carpeta node_modules no encontrada. Ejecutando npm install...${RESET}`);
      
      // Ejecutar npm install
      execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log(`${GREEN}✓ Dependencias de Node.js instaladas correctamente${RESET}`);
    } else {
      console.log(`${GREEN}✓ Dependencias de Node.js ya instaladas${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}✗ Error al instalar dependencias de Node.js: ${error.message}${RESET}`);
  }
  
  // Verificar dependencias de Python
  try {
    // Verificar si requirements.txt existe
    const requirementsPath = path.join(ROOT_DIR, 'requirements.txt');
    
    if (fs.existsSync(requirementsPath)) {
      console.log(`${YELLOW}Instalando dependencias de Python...${RESET}`);
      
      // Ejecutar pip install
      execSync('pip install -r requirements.txt', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log(`${GREEN}✓ Dependencias de Python instaladas correctamente${RESET}`);
    } else {
      console.log(`${YELLOW}⚠️ Archivo requirements.txt no encontrado${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}✗ Error al instalar dependencias de Python: ${error.message}${RESET}`);
  }
}

/**
 * Función principal
 */
async function setup() {
  console.log('=== CONFIGURACIÓN DE EL CONCILIADOR ===');
  
  // Configurar directorios
  setupDirectories();
  
  // Configurar archivo .env
  setupEnvFile();
  
  // Verificar dependencias
  checkDependencies();
  
  console.log('\n=== RESUMEN DE CONFIGURACIÓN ===');
  console.log(`${GREEN}✓ Estructura de directorios configurada${RESET}`);
  console.log(`${GREEN}✓ Archivo .env verificado${RESET}`);
  console.log(`${GREEN}✓ Dependencias verificadas${RESET}`);
  
  console.log('\n=== SIGUIENTE PASO ===');
  console.log('Para ejecutar el servidor de desarrollo:');
  console.log('  npm run dev');
  console.log('\nPara ejecutar pruebas de integración:');
  console.log('  npm run test:integration');
}

// Ejecutar configuración
setup().catch(error => {
  console.error(`${RED}Error durante la configuración: ${error.message}${RESET}`);
  process.exit(1);
});