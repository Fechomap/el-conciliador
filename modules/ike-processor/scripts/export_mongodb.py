#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo para exportar datos de Excel a MongoDB

Este script forma parte del proyecto "El Conciliador" y se encarga de:
1. Leer los datos procesados en archivos Excel
2. Transformarlos al formato requerido por MongoDB
3. Exportar los datos a la colección de expedientes en MongoDB

Uso:
    python scripts/export_mongodb.py output/data.xlsx
    
    Opciones:
    --uri              URI de conexión a MongoDB (opcional, por defecto usa variable de entorno MONGODB_URI)
    --db               Nombre de la base de datos (opcional, por defecto "el_conciliador")
    --collection       Nombre de la colección (opcional, por defecto "expedientes")
    --log_file         Archivo de log (opcional, por defecto "output/log_mongodb.txt")
    --client_id        Identificador del cliente (opcional, por defecto "IKE")
    --dry_run          Ejecutar sin insertar en MongoDB (opcional)
    --force_update     Forzar actualización de registros existentes (opcional)
"""

import os
import sys
import json
import time
import logging
import argparse
import pandas as pd
from datetime import datetime
from decimal import Decimal
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient, errors

# Cargar variables de entorno desde archivo .env
load_dotenv()

# Configuración de logging
def setup_logging(log_file):
    """Configura el sistema de logging"""
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    # Configurar el logger principal
    logger = logging.getLogger('export_mongodb')
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

# Funciones para transformación y normalización de datos
def normalize_value(value):
    """Normaliza un valor para su inserción en MongoDB"""
    if pd.isna(value) or value is None:
        return None
    
    # Convertir a string y limpiar espacios
    if isinstance(value, (str, float, int)):
        if isinstance(value, str):
            value = value.strip()
            if value == "":
                return None
        
        # Intentar convertir strings a números cuando sea apropiado
        if isinstance(value, str):
            # Convertir montos monetarios (eliminar $ y ,)
            if value.startswith('$'):
                try:
                    return float(value.replace('$', '').replace(',', ''))
                except ValueError:
                    pass
            
            # Intentar convertir a entero si es posible
            if value.isdigit():
                return int(value)
            
            # Intentar convertir a float si tiene punto decimal
            try:
                if '.' in value and value.replace('.', '').isdigit():
                    return float(value)
            except ValueError:
                pass
    
    # Formatear Decimales adecuadamente para MongoDB
    if isinstance(value, Decimal):
        return float(value)
    
    return value

def normalize_date(date_value):
    """Normaliza un valor de fecha para MongoDB"""
    if pd.isna(date_value) or date_value is None or date_value == "Sin fecha":
        return None
    
    try:
        # Si ya es un objeto datetime, devolverlo
        if isinstance(date_value, (datetime, pd.Timestamp)):
            return date_value.isoformat()
        
        # Intentar varios formatos comunes para fechas
        date_formats = [
            '%d/%m/%Y',  # 31/12/2023
            '%Y-%m-%d',  # 2023-12-31
            '%d-%m-%Y',  # 31-12-2023
            '%d.%m.%Y',  # 31.12.2023
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(str(date_value), fmt)
                return dt.isoformat()
            except ValueError:
                continue
        
        # Si llegamos aquí, ningún formato coincidió
        logging.warning(f"No se pudo convertir la fecha: {date_value}")
        return str(date_value)  # Devolver como string para evitar pérdida de datos
    
    except Exception as e:
        logging.error(f"Error al normalizar fecha '{date_value}': {str(e)}")
        return str(date_value)

def transform_excel_row(row, client_id):
    """
    Transforma una fila del Excel al formato de documento para MongoDB
    """
    # Extraer el número de expediente (pieza) y el número de pedido
    expediente = normalize_value(row.get('Nº de pieza', None))
    pedido = normalize_value(row.get('Numero de Pedido', None))
    
    # Validar que tengamos un expediente válido
    if not expediente:
        logging.warning(f"Fila sin número de expediente válido: {row}")
        return None
    
    # Estructurar documento base para el expediente
    doc = {
        "numeroExpediente": str(expediente),
        "cliente": client_id,
        "datos": {
            "tipoServicio": normalize_value(row.get('Tipo', None)) or "Arrastre",
            "descripcion": normalize_value(row.get('Descripcion', None))
        },
        "pedidos": [{
            "numeroPedido": str(pedido) if pedido else None,
            "numeroLinea": normalize_value(row.get('Numero de linea', None)),
            "fechaRequerida": normalize_date(row.get('Fecha', None)),
            "cantidad": normalize_value(row.get('Cantidad', None)),
            "precioUnitario": normalize_value(row.get('Precio por unidad', None)),
            "subtotal": normalize_value(row.get('Subtotal', None)),
            "impuesto": normalize_value(row.get('Impuesto', None)),
            "estatus": normalize_value(row.get('Status', 'NO FACTURADO')),
            "numeroFactura": normalize_value(row.get('No factura', None))
        }]
    }
    
    # Agregar metadatos
    doc["metadatos"] = {
        "ultimaActualizacion": datetime.now().isoformat(),
        "fuenteDatos": "export_mongodb.py",
        "version": "1.0.0"
    }
    
    return doc

def merge_pedido(existing_doc, new_pedido):
    """
    Fusiona un nuevo pedido en un documento existente,
    o actualiza un pedido existente si ya existe el número de pedido
    """
    if not existing_doc.get('pedidos'):
        existing_doc['pedidos'] = []
    
    # Verificar si el pedido ya existe
    pedido_numero = new_pedido.get('numeroPedido')
    if not pedido_numero:
        # Si no hay número de pedido, simplemente agregar
        existing_doc['pedidos'].append(new_pedido)
        return existing_doc
    
    # Buscar si ya existe este número de pedido
    pedido_exists = False
    for i, pedido in enumerate(existing_doc['pedidos']):
        if pedido.get('numeroPedido') == pedido_numero:
            # Actualizar el pedido existente con los nuevos datos
            # Mantenemos valores no nulos del pedido existente si el nuevo no los tiene
            for key, value in new_pedido.items():
                if value is not None:
                    existing_doc['pedidos'][i][key] = value
            
            pedido_exists = True
            break
    
    # Si no existe, agregar como nuevo
    if not pedido_exists:
        existing_doc['pedidos'].append(new_pedido)
    
    return existing_doc

def read_excel_data(excel_path):
    """Lee los datos del archivo Excel"""
    try:
        df = pd.read_excel(excel_path)
        return df.to_dict(orient='records')
    except Exception as e:
        logging.error(f"Error al leer el archivo Excel {excel_path}: {str(e)}")
        return []

def connect_to_mongodb(uri, db_name, collection_name):
    """Establece conexión con MongoDB y devuelve la colección"""
    try:
        client = MongoClient(uri)
        db = client[db_name]
        collection = db[collection_name]
        
        # Verificar conexión
        client.admin.command('ping')
        logging.info("Conexión a MongoDB establecida correctamente")
        
        # Crear índices si no existen
        collection.create_index([("numeroExpediente", pymongo.ASCENDING), ("cliente", pymongo.ASCENDING)], 
                                unique=True, background=True)
        collection.create_index([("pedidos.numeroPedido", pymongo.ASCENDING)], background=True)
        
        return collection
    except Exception as e:
        logging.error(f"Error al conectar con MongoDB: {str(e)}")
        return None

def upsert_document(collection, document, force_update=False):
    """
    Inserta o actualiza un documento en la colección
    
    Args:
        collection: La colección de MongoDB
        document: El documento a insertar/actualizar
        force_update: Si es True, fuerza actualización incluso de campos existentes
    
    Returns:
        dict: resultado de la operación con campos 'success', 'operation', 'error'
    """
    result = {'success': False, 'operation': None, 'error': None}
    
    try:
        # Preparar filtro para búsqueda
        filter_doc = {
            "numeroExpediente": document["numeroExpediente"],
            "cliente": document["cliente"]
        }
        
        # Verificar si el documento existe
        existing_doc = collection.find_one(filter_doc)
        
        if existing_doc:
            # Si existe, actualizar sólo los campos necesarios
            update_doc = document.copy()
            
            # Extraer el pedido a actualizar/agregar
            pedido = None
            if 'pedidos' in update_doc and update_doc['pedidos']:
                pedido = update_doc['pedidos'][0]
                del update_doc['pedidos']
            
            # Si force_update es False, solo actualizamos metadatos
            if not force_update:
                # Mantener solo metadatos para actualización
                update_doc = {"metadatos": document["metadatos"]}
            
            # Actualizar el documento base
            if update_doc:
                collection.update_one(
                    filter_doc,
                    {"$set": update_doc}
                )
            
            # Si hay pedido, fusionarlo correctamente
            if pedido:
                # Obtener documento actualizado
                current_doc = collection.find_one(filter_doc)
                updated_doc = merge_pedido(current_doc, pedido)
                
                # Actualizar con el documento fusionado
                collection.replace_one(filter_doc, updated_doc)
            
            result['operation'] = 'update'
        else:
            # Si no existe, insertar nuevo
            collection.insert_one(document)
            result['operation'] = 'insert'
        
        result['success'] = True
    except Exception as e:
        result['error'] = str(e)
        logging.error(f"Error al insertar/actualizar documento: {str(e)}")
    
    return result

def export_to_mongodb(excel_data, collection, client_id, dry_run=False, force_update=False):
    """
    Exporta los datos a MongoDB
    
    Args:
        excel_data: Datos leídos del Excel
        collection: Colección de MongoDB
        client_id: Identificador del cliente
        dry_run: Si es True, simula la exportación sin realizar cambios
        force_update: Si es True, fuerza actualización de documentos existentes
    
    Returns:
        dict: Estadísticas del proceso
    """
    stats = {
        'total': len(excel_data),
        'processed': 0,
        'inserted': 0,
        'updated': 0,
        'failed': 0,
        'skipped': 0
    }
    
    for row in excel_data:
        try:
            # Transformar fila a documento MongoDB
            document = transform_excel_row(row, client_id)
            
            # Saltar filas sin expediente válido
            if not document:
                stats['skipped'] += 1
                continue
            
            stats['processed'] += 1
            
            # En modo dry_run solo simulamos
            if dry_run:
                logging.info(f"[DRY RUN] Procesado documento para expediente: {document['numeroExpediente']}")
                continue
            
            # Insertar o actualizar en MongoDB
            result = upsert_document(collection, document, force_update)
            
            if result['success']:
                if result['operation'] == 'insert':
                    stats['inserted'] += 1
                    logging.info(f"Insertado nuevo expediente: {document['numeroExpediente']}")
                else:
                    stats['updated'] += 1
                    logging.info(f"Actualizado expediente existente: {document['numeroExpediente']}")
            else:
                stats['failed'] += 1
                logging.error(f"Error al procesar expediente {document['numeroExpediente']}: {result['error']}")
            
        except Exception as e:
            stats['failed'] += 1
            logging.error(f"Error al procesar fila: {str(e)}")
    
    return stats

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="Exportador de datos a MongoDB - Proyecto El Conciliador",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplo de uso:
    python scripts/export_mongodb.py output/data.xlsx
    
    Con opciones personalizadas:
    python scripts/export_mongodb.py output/data.xlsx --uri "mongodb+srv://..." --client_id "OTRO_CLIENTE"
        """
    )
    
    parser.add_argument("excel_file", 
                      help="Ruta del archivo Excel a exportar")
    parser.add_argument("--uri", 
                      default=os.getenv("MONGODB_URI"),
                      help="URI de conexión a MongoDB")
    parser.add_argument("--db", 
                      default="el_conciliador",
                      help="Nombre de la base de datos (default: el_conciliador)")
    parser.add_argument("--collection", 
                      default="expedientes",
                      help="Nombre de la colección (default: expedientes)")
    parser.add_argument("--log_file", 
                      default="output/log_mongodb.txt",
                      help="Archivo de log (default: output/log_mongodb.txt)")
    parser.add_argument("--client_id", 
                      default="IKE",
                      help="Identificador del cliente (default: IKE)")
    parser.add_argument("--dry_run", 
                      action="store_true",
                      help="Ejecutar sin insertar en MongoDB (simulación)")
    parser.add_argument("--force_update", 
                      action="store_true",
                      help="Forzar actualización de documentos existentes")
    
    args = parser.parse_args()
    
    # Configurar logging
    logger = setup_logging(args.log_file)
    
    # Validar que existe el archivo Excel
    if not os.path.exists(args.excel_file):
        logger.error(f"El archivo Excel no existe: {args.excel_file}")
        sys.exit(1)
    
    # Validar URI de MongoDB
    if not args.uri:
        logger.error("URI de MongoDB no especificada. Use --uri o defina MONGODB_URI en .env")
        sys.exit(1)
    
    logger.info("======================================")
    logger.info("  INICIANDO EXPORTACIÓN A MONGODB")
    logger.info("======================================")
    logger.info(f"Archivo Excel: {args.excel_file}")
    logger.info(f"Base de datos: {args.db}")
    logger.info(f"Colección: {args.collection}")
    logger.info(f"Cliente: {args.client_id}")
    logger.info(f"Modo simulación: {'Sí' if args.dry_run else 'No'}")
    logger.info(f"Forzar actualización: {'Sí' if args.force_update else 'No'}")
    
    # Leer datos del Excel
    logger.info("Leyendo datos del archivo Excel...")
    start_time = time.time()
    excel_data = read_excel_data(args.excel_file)
    
    if not excel_data:
        logger.error("No se pudieron leer datos del archivo Excel o está vacío")
        sys.exit(1)
    
    logger.info(f"Leídos {len(excel_data)} registros del Excel en {time.time() - start_time:.2f} segundos")
    
    # Conectar a MongoDB
    logger.info("Conectando a MongoDB...")
    collection = connect_to_mongodb(args.uri, args.db, args.collection)
    
    if collection is None:
        logger.error("No se pudo establecer conexión con MongoDB")
        sys.exit(1)
    
    # Exportar datos
    logger.info("Iniciando exportación de datos...")
    export_start = time.time()
    
    stats = export_to_mongodb(
        excel_data=excel_data,
        collection=collection,
        client_id=args.client_id,
        dry_run=args.dry_run,
        force_update=args.force_update
    )
    
    export_time = time.time() - export_start
    
    # Generar reporte final
    logger.info("\n======================================")
    logger.info("  REPORTE DE EXPORTACIÓN")
    logger.info("======================================")
    logger.info(f"Total de registros procesados: {stats['processed']} de {stats['total']}")
    logger.info(f"Nuevos expedientes insertados: {stats['inserted']}")
    logger.info(f"Expedientes actualizados: {stats['updated']}")
    logger.info(f"Registros omitidos: {stats['skipped']}")
    logger.info(f"Errores: {stats['failed']}")
    logger.info(f"Tiempo total de exportación: {export_time:.2f} segundos")
    
    if args.dry_run:
        logger.info("\n⚠️ MODO SIMULACIÓN: No se realizaron cambios en MongoDB")
    
    logger.info("\n✅ PROCESO DE EXPORTACIÓN COMPLETADO")
    logger.info("======================================")

if __name__ == "__main__":
    main()