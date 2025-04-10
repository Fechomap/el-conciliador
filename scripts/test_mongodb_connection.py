#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para probar la conexión a MongoDB y validar el esquema

Este script verifica:
1. La conexión a MongoDB Atlas
2. La existencia de la base de datos y colecciones
3. La creación de índices necesarios
4. La validación del esquema básico

Uso:
    python scripts/test_mongodb_connection.py
"""

import os
import sys
import json
import argparse
from dotenv import load_dotenv
from pymongo import MongoClient, errors
from datetime import datetime

# Cargar variables de entorno
load_dotenv()

def test_connection(uri, db_name, verbose=False):
    """Prueba la conexión a MongoDB"""
    try:
        # Crear cliente MongoDB
        client = MongoClient(uri)
        
        # Verificar conexión con ping
        client.admin.command('ping')
        print("✅ Conexión a MongoDB exitosa")
        
        # Listar bases de datos disponibles
        dbs = client.list_database_names()
        if verbose:
            print(f"\nBases de datos disponibles: {', '.join(dbs)}")
        
        # Verificar si existe la base de datos
        if db_name in dbs:
            print(f"✅ Base de datos '{db_name}' encontrada")
        else:
            print(f"⚠️ Base de datos '{db_name}' no existe aún (se creará automáticamente)")
        
        # Obtener referencia a la base de datos
        db = client[db_name]
        
        # Listar colecciones
        collections = db.list_collection_names()
        if collections:
            print(f"✅ Colecciones encontradas: {', '.join(collections)}")
        else:
            print("ℹ️ No hay colecciones en la base de datos (se crearán automáticamente)")
        
        return client, db
    
    except errors.ConnectionFailure as e:
        print(f"❌ Error de conexión a MongoDB: {str(e)}")
        return None, None
    except errors.OperationFailure as e:
        print(f"❌ Error de operación en MongoDB: {str(e)}")
        return None, None
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
        return None, None

def setup_schema(db, test_document=True):
    """Configura el esquema y los índices necesarios"""
    try:
        # Obtener referencia a las colecciones
        expedientes = db["expedientes"]
        clientes = db["clientes"]
        logs = db["logs"]
        
        # Crear índices para expedientes
        print("\nCreando índices para la colección 'expedientes'...")
        expedientes.create_index(
            [("numeroExpediente", 1), ("cliente", 1)],
            unique=True,
            background=True
        )
        print("✅ Índice creado: numeroExpediente + cliente (unique)")
        
        expedientes.create_index([("pedidos.numeroPedido", 1)], background=True)
        print("✅ Índice creado: pedidos.numeroPedido")
        
        expedientes.create_index([("metadatos.ultimaActualizacion", -1)], background=True)
        print("✅ Índice creado: metadatos.ultimaActualizacion (desc)")
        
        # Crear índices para clientes
        print("\nCreando índices para la colección 'clientes'...")
        clientes.create_index([("codigo", 1)], unique=True, background=True)
        print("✅ Índice creado: codigo (unique)")
        
        # Crear índices para logs
        print("\nCreando índices para la colección 'logs'...")
        logs.create_index([("timestamp", -1)], background=True)
        print("✅ Índice creado: timestamp (desc)")
        logs.create_index([("cliente", 1), ("timestamp", -1)], background=True)
        print("✅ Índice creado: cliente + timestamp")
        
        # Verificar existencia del cliente IKE y crearlo si no existe
        if not clientes.find_one({"codigo": "IKE"}):
            print("\nCreando configuración para cliente IKE...")
            ike_client = {
                "codigo": "IKE",
                "nombre": "Cliente IKE",
                "configuracion": {
                    "columnasMostradas": ["numeroExpediente", "fechaCreacion", "estatus"],
                    "rutasProcesamiento": {
                        "ordenes": "PDF-PEDIDOS/",
                        "facturas": "PDF-FACTURAS/"
                    }
                },
                "metadatos": {
                    "fechaCreacion": datetime.now().isoformat(),
                    "version": "1.0.0"
                }
            }
            clientes.insert_one(ike_client)
            print("✅ Cliente IKE creado correctamente")
        else:
            print("✅ Cliente IKE ya existe en la colección")
        
        # Insertar documento de prueba
        if test_document:
            print("\nCreando documento de prueba...")
            test_doc = {
                "numeroExpediente": "TEST00001",
                "cliente": "IKE",
                "datos": {
                    "tipoServicio": "Test",
                    "descripcion": "Documento de prueba para validación"
                },
                "pedidos": [{
                    "numeroPedido": "1234567890",
                    "numeroLinea": 1,
                    "fechaRequerida": datetime.now().isoformat(),
                    "precioUnitario": 100.0,
                    "subtotal": 100.0,
                    "impuesto": 16.0,
                    "estatus": "PRUEBA",
                }],
                "metadatos": {
                    "ultimaActualizacion": datetime.now().isoformat(),
                    "fuenteDatos": "test_mongodb_connection.py",
                    "version": "1.0.0"
                }
            }
            
            # Eliminar documento de prueba si existe
            expedientes.delete_one({
                "numeroExpediente": "TEST00001",
                "cliente": "IKE"
            })
            
            # Insertar nuevo documento de prueba
            result = expedientes.insert_one(test_doc)
            
            # Verificar inserción
            if result.inserted_id:
                print(f"✅ Documento de prueba insertado con ID: {result.inserted_id}")
                
                # Leer documento para verificar
                doc = expedientes.find_one({"numeroExpediente": "TEST00001"})
                if doc:
                    print("✅ Documento de prueba leído correctamente")
                    
                    # Eliminar documento de prueba
                    expedientes.delete_one({"numeroExpediente": "TEST00001"})
                    print("✅ Documento de prueba eliminado")
                else:
                    print("❌ No se pudo leer el documento de prueba")
            else:
                print("❌ No se pudo insertar el documento de prueba")
            
            # Registrar log de prueba
            logs.insert_one({
                "timestamp": datetime.now().isoformat(),
                "operacion": "test_conexion",
                "cliente": "IKE",
                "detalles": {
                    "resultado": "exitoso",
                    "mensaje": "Prueba de conexión y esquema completada"
                }
            })
            print("✅ Log de prueba registrado")
            
        return True
    
    except Exception as e:
        print(f"❌ Error al configurar esquema: {str(e)}")
        return False

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="Test de conexión a MongoDB para El Conciliador",
    )
    
    parser.add_argument("--uri", 
                      default=os.getenv("MONGODB_URI"),
                      help="URI de conexión a MongoDB")
    parser.add_argument("--db", 
                      default=os.getenv("MONGODB_DB_NAME", "el_conciliador"),
                      help="Nombre de la base de datos")
    parser.add_argument("--verbose", "-v",
                      action="store_true",
                      help="Mostrar información detallada")
    parser.add_argument("--no-test",
                      action="store_true",
                      help="No insertar documento de prueba")
    
    args = parser.parse_args()
    
    # Validar URI
    if not args.uri:
        print("❌ URI de MongoDB no especificada. Use --uri o defina MONGODB_URI en .env")
        sys.exit(1)
    
    print("\n=== TEST DE CONEXIÓN A MONGODB ===")
    print(f"URI: {args.uri.split('@')[0].split('://')[0]}://*****@{args.uri.split('@')[1] if '@' in args.uri else '***'}")
    print(f"Base de datos: {args.db}")
    print(f"Insertar documento de prueba: {'No' if args.no_test else 'Sí'}")
    print("=================================")
    
    # Probar conexión
    client, db = test_connection(args.uri, args.db, args.verbose)
    
    if client is None or db is None:
        print("\n❌ No se pudo establecer conexión con MongoDB. Verifique su URI y conexión a internet.")
        sys.exit(1)
    
    # Configurar esquema
    print("\n=== CONFIGURACIÓN DE ESQUEMA ===")
    success = setup_schema(db, not args.no_test)
    
    if success:
        print("\n✅ Prueba completada correctamente. MongoDB está listo para usar.")
    else:
        print("\n❌ Se encontraron errores durante la configuración del esquema.")
        sys.exit(1)
    
    # Cerrar cliente
    client.close()

if __name__ == "__main__":
    main()