#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script integrador para el procesamiento de PDFs y exportación a MongoDB

Este script coordina la ejecución de los componentes del sistema:
1. Procesa los PDFs de pedidos (extract.py)
2. Procesa los PDFs de facturas (detect.py)
3. Exporta los datos procesados a MongoDB (export_mongodb.py)

Uso:
    python scripts/process_and_export.py

Este script es parte del proyecto "El Conciliador" - Fase 2
"""

import os
import sys
import time
import argparse
import subprocess
import logging
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar logging
def setup_logging(log_file):
    """Configura el sistema de logging"""
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    # Configurar el logger principal
    logger = logging.getLogger('process_and_export')
    logger.setLevel(logging.DEBUG)
    
    # Handler para archivo
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    
    # Handler para consola
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Formato para los logs
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # Agregar handlers al logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

def run_command(cmd, logger, step_name):
    """Ejecuta un comando y registra su salida"""
    logger.info(f"Iniciando paso: {step_name}")
    logger.info(f"Ejecutando comando: {' '.join(cmd)}")
    
    start_time = time.time()
    
    try:
        # Ejecutar el comando y capturar salida
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Leer la salida en tiempo real
        for line in process.stdout:
            logger.info(line.strip())
        
        # Esperar a que termine el proceso
        process.wait()
        
        # Comprobar si hubo errores
        if process.returncode != 0:
            error_output = process.stderr.read()
            logger.error(f"Error en {step_name}. Código de salida: {process.returncode}")
            logger.error(f"Mensaje de error: {error_output}")
            return False
        
        # Registrar tiempo de ejecución
        execution_time = time.time() - start_time
        logger.info(f"{step_name} completado en {execution_time:.2f} segundos")
        
        return True
    
    except Exception as e:
        logger.error(f"Excepción al ejecutar {step_name}: {str(e)}")
        return False

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="Procesador integrado de PDFs y exportación a MongoDB - Proyecto El Conciliador",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplo de uso:
    python scripts/process_and_export.py
    
    Con opciones personalizadas:
    python scripts/process_and_export.py --skip-processing --only-export
        """
    )
    
    parser.add_argument("--input-pedidos", 
                       default="PDF-PEDIDOS",
                       help="Carpeta de entrada para PDFs de pedidos (default: PDF-PEDIDOS)")
    parser.add_argument("--input-facturas", 
                       default="PDF-FACTURAS",
                       help="Carpeta de entrada para PDFs de facturas (default: PDF-FACTURAS)")
    parser.add_argument("--output-folder", 
                       default="output",
                       help="Carpeta de salida (default: output)")
    parser.add_argument("--excel-file", 
                       default="data.xlsx",
                       help="Nombre del archivo Excel (default: data.xlsx)")
    parser.add_argument("--log-file", 
                       default="log_process.txt",
                       help="Archivo de log (default: log_process.txt)")
    parser.add_argument("--skip-processing", 
                       action="store_true",
                       help="Omitir procesamiento de PDFs (solo exportar)")
    parser.add_argument("--skip-export", 
                       action="store_true",
                       help="Omitir exportación a MongoDB (solo procesar PDFs)")
    parser.add_argument("--only-pedidos", 
                       action="store_true",
                       help="Procesar solo PDFs de pedidos")
    parser.add_argument("--only-facturas", 
                       action="store_true",
                       help="Procesar solo PDFs de facturas")
    parser.add_argument("--mongodb-uri", 
                       default=os.getenv("MONGODB_URI"),
                       help="URI de conexión a MongoDB")
    
    args = parser.parse_args()
    
    # Configurar rutas
    output_folder = args.output_folder
    excel_path = os.path.join(output_folder, args.excel_file)
    log_path = os.path.join(output_folder, args.log_file)
    
    # Asegurar que existan las carpetas
    os.makedirs(output_folder, exist_ok=True)
    os.makedirs(args.input_pedidos, exist_ok=True)
    os.makedirs(args.input_facturas, exist_ok=True)
    
    # Configurar logging
    logger = setup_logging(log_path)
    
    # Informar inicio del proceso
    logger.info("=" * 50)
    logger.info("INICIANDO PROCESO INTEGRADO DE PDFS Y EXPORTACIÓN")
    logger.info("=" * 50)
    logger.info(f"Carpeta de pedidos: {args.input_pedidos}")
    logger.info(f"Carpeta de facturas: {args.input_facturas}")
    logger.info(f"Archivo Excel: {excel_path}")
    logger.info(f"Modo: {'Solo exportación' if args.skip_processing else 'Procesamiento completo'}")
    
    # Validar archivos y carpetas
    if not args.skip_processing:
        logger.info("\nVerificando carpetas de entrada...")
        
        pedidos_files = [f for f in os.listdir(args.input_pedidos) if f.lower().endswith('.pdf')]
        facturas_files = [f for f in os.listdir(args.input_facturas) if f.lower().endswith('.pdf')]
        
        logger.info(f"PDFs de pedidos encontrados: {len(pedidos_files)}")
        logger.info(f"PDFs de facturas encontrados: {len(facturas_files)}")
    
    # PASO 1: Procesar PDFs de pedidos
    if not args.skip_processing and not args.only_facturas:
        extract_cmd = [
            sys.executable,
            "modules/ike-processor/scripts/extract.py",
            args.input_pedidos,
            excel_path,
            os.path.join(output_folder, "log.txt")
        ]
        
        success = run_command(extract_cmd, logger, "Procesamiento de pedidos")
        if not success:
            logger.error("❌ Error en el procesamiento de pedidos. Revise los logs para más detalles.")
            # Continuar con el siguiente paso aunque haya error
    
    # PASO 2: Procesar PDFs de facturas
    if not args.skip_processing and not args.only_pedidos:
        detect_cmd = [
            sys.executable,
            "modules/ike-processor/scripts/detect.py",
            args.input_facturas,
            excel_path,
            "--log_file",
            os.path.join(output_folder, "log_facturas.txt")
        ]
        
        success = run_command(detect_cmd, logger, "Procesamiento de facturas")
        if not success:
            logger.error("❌ Error en el procesamiento de facturas. Revise los logs para más detalles.")
            # Continuar con el siguiente paso aunque haya error
    
    # PASO 3: Exportar a MongoDB
    if not args.skip_export:
        # Verificar que existe el Excel
        if not os.path.exists(excel_path):
            logger.error(f"❌ No se encuentra el archivo Excel: {excel_path}")
            sys.exit(1)
        
        # Verificar que tenemos URI de MongoDB
        if not args.mongodb_uri:
            logger.error("❌ URI de MongoDB no especificada. Use --mongodb-uri o defina MONGODB_URI en .env")
            sys.exit(1)
        
        export_cmd = [
            sys.executable,
            "modules/ike-processor/scripts/export_mongodb.py",
            excel_path,
            "--uri", args.mongodb_uri,
            "--log_file", os.path.join(output_folder, "log_mongodb.txt")
        ]
        
        success = run_command(export_cmd, logger, "Exportación a MongoDB")
        if not success:
            logger.error("❌ Error en la exportación a MongoDB. Revise los logs para más detalles.")
            sys.exit(1)
    
    # Resumen final
    logger.info("\n" + "=" * 50)
    logger.info("PROCESO INTEGRADO COMPLETADO")
    logger.info("=" * 50)
    logger.info("✅ Todos los pasos han sido ejecutados")
    logger.info(f"📋 Consulte los archivos de log en la carpeta '{output_folder}' para más detalles")
    logger.info("=" * 50)

if __name__ == "__main__":
    main()