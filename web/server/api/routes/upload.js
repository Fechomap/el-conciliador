/**
 * Rutas API para gestionar la carga y procesamiento de archivos
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Configurar __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../');

// Configurar el router
const router = express.Router();

// Configurar almacenamiento para multer (gestor de subida de archivos)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    // Determinar la carpeta de destino según el tipo de archivo
    if (file.fieldname === 'orderPdfs') {
      uploadPath = path.join(ROOT_DIR, 'PDF-PEDIDOS');
    } else if (file.fieldname === 'invoicePdfs') {
      uploadPath = path.join(ROOT_DIR, 'PDF-FACTURAS');
    } else if (file.fieldname === 'excelFile') {
      uploadPath = path.join(ROOT_DIR, 'output');
    } else {
      uploadPath = path.join(ROOT_DIR, 'uploads');
    }
    
    // Asegurarse de que la carpeta exista
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Para Excel, mantener el nombre original o asignar uno predeterminado
    if (file.fieldname === 'excelFile') {
      cb(null, file.originalname === 'data.xlsx' ? file.originalname : 'data.xlsx');
    } else {
      // Para PDFs, conservar el nombre original
      cb(null, file.originalname);
    }
  }
});

// Configurar filtro de archivos
const fileFilter = (req, file, cb) => {
  // Verificar extensiones permitidas según el tipo de campo
  if (file.fieldname === 'orderPdfs' || file.fieldname === 'invoicePdfs') {
    // Solo permitir PDFs
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      return cb(new Error('Solo se permiten archivos PDF'), false);
    }
  } else if (file.fieldname === 'excelFile') {
    // Solo permitir Excel
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
    }
  }
  
  cb(null, true);
};

// Configurar multer con límites
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max por archivo
    files: 50 // Máximo 50 archivos a la vez
  }
});

// Configurar campos de carga
const uploadFields = [
  { name: 'orderPdfs', maxCount: 20 },
  { name: 'invoicePdfs', maxCount: 20 },
  { name: 'excelFile', maxCount: 1 }
];

/**
 * Ejecuta un comando y devuelve una promesa con el resultado
 */
function executeCommand(command, args, cwd = ROOT_DIR) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Proceso terminado con código ${code}: ${stderr}`));
      }
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * @route   POST /api/upload/process
 * @desc    Procesar archivos subidos (PDFs y Excel)
 * @access  Public
 */
router.post('/process', upload.fields(uploadFields), async (req, res) => {
  const sessionId = uuidv4();
  const logFile = path.join(ROOT_DIR, 'output', `log_${sessionId}.txt`);
  
  try {
    // Registrar archivos recibidos
    const orderPdfs = req.files['orderPdfs'] || [];
    const invoicePdfs = req.files['invoicePdfs'] || [];
    const excelFile = req.files['excelFile'] ? req.files['excelFile'][0] : null;
    
    console.log(`Procesando lote ${sessionId}:`);
    console.log(`- PDFs de pedidos: ${orderPdfs.length}`);
    console.log(`- PDFs de facturas: ${invoicePdfs.length}`);
    console.log(`- Excel: ${excelFile ? 'Sí' : 'No'}`);
    
    // Resultados para seguimiento
    const results = {
      sessionId,
      uploadedFiles: {
        orderPdfs: orderPdfs.map(f => f.originalname),
        invoicePdfs: invoicePdfs.map(f => f.originalname),
        excelFile: excelFile ? excelFile.originalname : null
      },
      steps: [],
      startTime: new Date().toISOString()
    };
    
    // 1. Procesar PDFs de pedidos (si hay alguno)
    if (orderPdfs.length > 0) {
      console.log('Procesando PDFs de pedidos...');
      results.steps.push({ name: 'process_orders', status: 'running' });
      
      try {
        const orderResult = await executeCommand('python', [
          'scripts/extract.py',
          'PDF-PEDIDOS',
          'output/data.xlsx',
          'output/log.txt'
        ]);
        
        results.steps[results.steps.length - 1].status = 'completed';
        results.steps[results.steps.length - 1].output = orderResult.stdout;
      } catch (error) {
        console.error('Error procesando PDFs de pedidos:', error);
        results.steps[results.steps.length - 1].status = 'error';
        results.steps[results.steps.length - 1].error = error.message;
        // Continuamos a pesar del error
      }
    }
    
    // 2. Procesar PDFs de facturas (si hay alguno)
    if (invoicePdfs.length > 0) {
      console.log('Procesando PDFs de facturas...');
      results.steps.push({ name: 'process_invoices', status: 'running' });
      
      try {
        const invoiceResult = await executeCommand('python', [
          'scripts/detect.py',
          'PDF-FACTURAS',
          'output/data.xlsx',
          '--log_file',
          'output/log_facturas.txt'
        ]);
        
        results.steps[results.steps.length - 1].status = 'completed';
        results.steps[results.steps.length - 1].output = invoiceResult.stdout;
      } catch (error) {
        console.error('Error procesando PDFs de facturas:', error);
        results.steps[results.steps.length - 1].status = 'error';
        results.steps[results.steps.length - 1].error = error.message;
        // Continuamos a pesar del error
      }
    }
    
    // 3. Sincronizar con MongoDB
    console.log('Sincronizando con MongoDB...');
    results.steps.push({ name: 'sync_mongodb', status: 'running' });
    
    try {
      let syncResult;
      
      // Verificar si tenemos un script de exportación directo o usamos el script general
      if (fs.existsSync(path.join(ROOT_DIR, 'scripts', 'export_mongodb.py'))) {
        syncResult = await executeCommand('python', [
          'scripts/export_mongodb.py',
          'output/data.xlsx'
        ]);
      } else {
        // Alternativa: usar el script JavaScript
        syncResult = await executeCommand('node', [
          'scripts/excel_mongodb_sync.js',
          'import'
        ]);
      }
      
      results.steps[results.steps.length - 1].status = 'completed';
      results.steps[results.steps.length - 1].output = syncResult.stdout;
    } catch (error) {
      console.error('Error sincronizando con MongoDB:', error);
      results.steps[results.steps.length - 1].status = 'error';
      results.steps[results.steps.length - 1].error = error.message;
      // Continuamos a pesar del error
    }
    
    // 4. Ejecutar el concentrador
    console.log('Ejecutando concentrador...');
    results.steps.push({ name: 'concentrator', status: 'running' });
    
    try {
      const concentratorResult = await executeCommand('node', [
        'scripts/test_concentrador.js'
      ]);
      
      results.steps[results.steps.length - 1].status = 'completed';
      results.steps[results.steps.length - 1].output = concentratorResult.stdout;
    } catch (error) {
      console.error('Error ejecutando concentrador:', error);
      results.steps[results.steps.length - 1].status = 'error';
      results.steps[results.steps.length - 1].error = error.message;
    }
    
    // Calcular estadísticas
    results.endTime = new Date().toISOString();
    results.processingTime = new Date() - new Date(results.startTime);
    results.success = results.steps.every(step => step.status === 'completed');
    
    // Guardar log de resultados
    fs.writeFileSync(logFile, JSON.stringify(results, null, 2));
    
    // Devolver respuesta al cliente
    res.json({
      success: true,
      message: 'Procesamiento completado',
      results: {
        sessionId,
        processingTime: `${Math.floor(results.processingTime / 1000 / 60)}:${String(Math.floor(results.processingTime / 1000) % 60).padStart(2, '0')}`,
        processedFiles: orderPdfs.length + invoicePdfs.length + (excelFile ? 1 : 0),
        steps: results.steps.map(step => ({
          name: step.name,
          status: step.status
        }))
      }
    });
    
  } catch (error) {
    console.error('Error en el proceso de carga:', error);
    
    // Guardar log de error
    fs.writeFileSync(logFile, JSON.stringify({
      sessionId,
      error: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    }, null, 2));
    
    res.status(500).json({
      success: false,
      message: 'Error durante el procesamiento de archivos',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/upload/status/:sessionId
 * @desc    Obtener estado de un proceso de carga
 * @access  Public
 */
router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const logFile = path.join(ROOT_DIR, 'output', `log_${sessionId}.txt`);
  
  try {
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const status = JSON.parse(logContent);
      
      res.json({
        success: true,
        status
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado de la sesión',
      error: error.message
    });
  }
});

export default router;