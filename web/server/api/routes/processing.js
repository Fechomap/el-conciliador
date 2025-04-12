import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises'; // Using promises for async operations
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs únicos para carpetas temporales

const router = express.Router();

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define project root relative paths for target directories
const projectRoot = path.resolve(__dirname, '../../../../'); // Adjust based on file location
const outputDir = path.join(projectRoot, 'modules/ike-processor/output');
const scriptsDir = path.join(projectRoot, 'modules/ike-processor/scripts');
const tempBaseDir = path.join(projectRoot, 'uploads'); // Base directory for temporary uploads

// Ensure base directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(tempBaseDir, { recursive: true });
    console.log('Required base directories ensured.');
  } catch (error) {
    console.error('Error ensuring directories:', error);
    // Handle error appropriately, maybe throw it to stop server startup
    throw new Error('Could not create necessary directories for file processing.');
  }
};

// Call ensureDirectories on server start or route initialization
ensureDirectories().catch(err => {
  console.error("Failed to ensure directories on startup:", err);
  process.exit(1); // Exit if directories can't be created
});

// Helper function to create temporary directories for each request
const createTempDirs = async () => {
  const sessionId = uuidv4(); // Generate unique ID for this processing session
  const tempSessionDir = path.join(tempBaseDir, sessionId);
  const tempPedidosDir = path.join(tempSessionDir, 'pedidos');
  const tempFacturasDir = path.join(tempSessionDir, 'facturas');
  const tempExcelDir = path.join(tempSessionDir, 'excel');
  
  await fs.mkdir(tempSessionDir, { recursive: true });
  await fs.mkdir(tempPedidosDir, { recursive: true });
  await fs.mkdir(tempFacturasDir, { recursive: true });
  await fs.mkdir(tempExcelDir, { recursive: true });
  
  return {
    sessionId,
    tempSessionDir,
    tempPedidosDir,
    tempFacturasDir,
    tempExcelDir
  };
};

// Helper function to clean up temporary directories
const cleanupTempDirs = async (tempSessionDir) => {
  try {
    await fs.rm(tempSessionDir, { recursive: true, force: true });
    console.log(`Cleaned up temporary directory: ${tempSessionDir}`);
  } catch (error) {
    console.error(`Error cleaning up temporary directory: ${tempSessionDir}`, error);
  }
};

// --- Route Definition ---
export const procesarArchivos = async (req, res) => {
  let tempDirs = null;
  
  try {
    // Create temporary directories for this request
    tempDirs = await createTempDirs();
    console.log(`Created temporary directories for session ${tempDirs.sessionId}`);
    
    // Configure multer with these temporary directories
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        // Determine destination based on field name
        if (file.fieldname === 'pedidosPdfs') {
          cb(null, tempDirs.tempPedidosDir);
        } else if (file.fieldname === 'facturasPdfs') {
          cb(null, tempDirs.tempFacturasDir);
        } else if (file.fieldname === 'excelFile') {
          cb(null, tempDirs.tempExcelDir);
        } else {
          cb(new Error(`Unknown field name: ${file.fieldname}`));
        }
      },
      filename: function (req, file, cb) {
        // IMPORTANT: Preserve original filename
        cb(null, file.originalname);
      }
    });

    const upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        // Optional: Add file type validation if needed
        const allowedTypes = /pdf|xlsx|xls/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
          return cb(null, true);
        }
        cb(new Error(`Error: File upload only supports the following filetypes - ${allowedTypes}`));
      }
    }).fields([
      { name: 'pedidosPdfs', maxCount: 50 }, // Allow multiple pedido PDFs
      { name: 'facturasPdfs', maxCount: 50 }, // Allow multiple factura PDFs
      { name: 'excelFile', maxCount: 1 }      // Allow one optional Excel file
    ]);
    
    // Use multer to handle the file upload
    const handleUpload = () => {
      return new Promise((resolve, reject) => {
        upload(req, res, (err) => {
          if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            reject(new Error(`Error de Multer: ${err.message}`));
          } else if (err) {
            console.error('Unknown upload error:', err);
            reject(new Error(`Error de carga: ${err.message}`));
          } else {
            resolve(req.files);
          }
        });
      });
    };
    
    // Wait for the upload to complete
    const files = await handleUpload();
    console.log('Files received and saved directly to temporary directories:', files);
    
    // Files are already in their respective temporary directories
    const { pedidosPdfs = [], facturasPdfs = [], excelFile = [] } = files;
    
    // --- Execute Python Scripts ---
    const executeScript = (scriptName, args = []) => {
      return new Promise((resolve, reject) => {
        const scriptPath = path.join(scriptsDir, scriptName);
        const argsStr = args.map(arg => `"${arg}"`).join(' ');
        const command = `python3 "${scriptPath}" ${argsStr}`;
        
        console.log(`[Script Execution] Starting: ${command}`);
        
        exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
          // Log output regardless of error
          if (stdout) {
            console.log(`[Script Execution] Stdout from ${scriptName}:\n${stdout}`);
          }
          if (stderr) {
            // Log stderr as warning or error depending on context
            console.warn(`[Script Execution] Stderr from ${scriptName}:\n${stderr}`);
          }

          if (error) {
            console.error(`[Script Execution] Error executing ${scriptName}:`, error);
            // Reject with a structured error including stderr if available
            return reject({
              script: scriptName,
              message: `Error en script (${error.code}): ${stderr || error.message}`.trim(),
              errorObject: error // Keep original error object if needed
            });
          }

          console.log(`[Script Execution] Finished successfully: ${scriptName}`);
          resolve(stdout || ''); // Resolve with stdout or empty string
        });
      });
    };

    console.log('[Script Execution] === Starting Script Sequence ===');
    
    // Paths for script arguments
    const dataExcelPath = path.join(outputDir, 'data.xlsx');
    const logFacturasPath = path.join(outputDir, 'log_facturas.txt');
    const logPedidosPath = path.join(outputDir, 'log_pedidos.txt');
    
    // Execute detect.py with temporary facturas directory
    if (facturasPdfs.length > 0) {
      console.log('[Script Execution] Attempting to execute detect.py...');
      await executeScript('detect.py', [
        tempDirs.tempFacturasDir,     // Temporary facturas directory
        dataExcelPath,                // output/data.xlsx
        `--log_file=${logFacturasPath}` // output/log_facturas.txt
      ]);
      console.log('[Script Execution] detect.py finished or resolved.');
    } else {
      console.log('[Script Execution] Skipping detect.py as no factura PDFs were uploaded.');
    }
    
    // Execute extract.py with temporary pedidos directory
    if (pedidosPdfs.length > 0) {
      console.log('[Script Execution] Attempting to execute extract.py...');
      await executeScript('extract.py', [
        tempDirs.tempPedidosDir,  // Temporary pedidos directory
        dataExcelPath,            // output/data.xlsx
        logPedidosPath            // output/log_pedidos.txt
      ]);
      console.log('[Script Execution] extract.py finished or resolved.');
    } else {
      console.log('[Script Execution] Skipping extract.py as no pedido PDFs were uploaded.');
    }
    
    console.log('[Script Execution] === Script Sequence Finished ===');

    // --- Success Response ---
    const successMessage = 'Archivos procesados y scripts ejecutados correctamente.';
    console.log(`[API Response] Attempting to send success response: ${successMessage}`);
    res.json({ success: true, message: successMessage });
    console.log('[API Response] Success response sent.');

  } catch (error) {
    console.error('[Error Handler] Caught error during processing:', error);

    // --- Error Response ---
    const errorMessage = error.script
      ? `Error en el script ${error.script}: ${error.message || 'Detalles no disponibles'}`
      : `Error durante el procesamiento: ${error.message || 'Error desconocido'}`;

    console.error(`[API Response] Attempting to send error response: ${errorMessage}`);
    res.status(500).json({ success: false, message: errorMessage });
    console.log('[API Response] Error response sent.');
  } finally {
    // Clean up temporary directories
    if (tempDirs && tempDirs.tempSessionDir) {
      try {
        await cleanupTempDirs(tempDirs.tempSessionDir);
      } catch (cleanupError) {
        console.error('[Cleanup] Error cleaning up temporary directories:', cleanupError);
      }
    }
  }
};

// Register the route
router.post('/', procesarArchivos);

// Export the router
export default router;
