"""
export_mongodb.py - Exporta datos del Excel generado a MongoDB

Este script lee el archivo Excel generado por el procesamiento de PDFs
y exporta los datos a MongoDB, preservando la estructura y tipos de datos.
"""
import os
import sys
import pandas as pd
import pymongo
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración MongoDB
MONGODB_URI = os.getenv('MONGODB_URI')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'el-conciliador')

def connect_to_mongodb():
    """Establece conexión con MongoDB"""
    try:
        client = pymongo.MongoClient(MONGODB_URI)
        db = client[MONGODB_DB_NAME]
        # Probar conexión
        client.admin.command('ping')
        print(f"Conectado a MongoDB: {MONGODB_DB_NAME}")
        return db
    except Exception as e:
        print(f"Error conectando a MongoDB: {e}")
        sys.exit(1)

def normalize_data(df):
    """Normaliza los datos del DataFrame para MongoDB"""
    # Convertir columnas a tipos adecuados
    if 'Numero de Pedido' in df.columns:
        df['Numero de Pedido'] = df['Numero de Pedido'].astype(str)
    
    if 'Nº de pieza' in df.columns:
        df['Nº de pieza'] = df['Nº de pieza'].astype(str)
    
    if 'Precio por unidad' in df.columns:
        df['Precio por unidad'] = pd.to_numeric(df['Precio por unidad'], errors='coerce')
    
    if 'Fecha' in df.columns:
        df['Fecha'] = pd.to_datetime(df['Fecha'], errors='coerce', format='%d/%m/%Y')
    
    return df

def export_to_mongodb(excel_path, cliente="IKE"):
    """Exporta datos del Excel a MongoDB"""
    try:
        # Conectar a MongoDB
        db = connect_to_mongodb()
        
        # Leer Excel
        print(f"Leyendo Excel: {excel_path}")
        df = pd.read_excel(excel_path)
        df = normalize_data(df)
        
        # Contadores para seguimiento
        registros_creados = 0
        registros_actualizados = 0
        errores = []
        
        # Procesar cada expediente (Nº de pieza)
        for expediente, grupo in df.groupby('Nº de pieza'):
            try:
                # Verificar que el expediente sea válido
                if not expediente or str(expediente).lower() == 'nan':
                    continue
                
                # Convertir a string y limpiar
                expediente_str = str(expediente).strip()
                
                # Buscar si ya existe este expediente
                existing = db.expedientes.find_one({'numeroExpediente': expediente_str, 'cliente': cliente})
                
                # Preparar datos del pedido
                pedidos = []
                for _, row in grupo.iterrows():
                    pedido = {
                        'numeroPedido': str(row.get('Numero de Pedido', '')).strip(),
                        'precio': float(row.get('Precio por unidad', 0)),
                        'estatus': row.get('Status', 'NO FACTURADO'),
                        'factura': row.get('No factura', '')
                    }
                    
                    # Convertir fecha si existe
                    fecha_pedido = row.get('Fecha')
                    if fecha_pedido and not pd.isna(fecha_pedido):
                        if isinstance(fecha_pedido, datetime):
                            pedido['fechaPedido'] = fecha_pedido
                        else:
                            try:
                                pedido['fechaPedido'] = datetime.strptime(str(fecha_pedido), '%d/%m/%Y')
                            except:
                                pass
                    
                    pedidos.append(pedido)
                
                # Datos del expediente
                expediente_data = {
                    'numeroExpediente': expediente_str,
                    'cliente': cliente,
                    'datos': {
                        'tipoServicio': grupo.iloc[0].get('Descripcion', 'No especificado')
                    },
                    'pedidos': pedidos,
                    'metadatos': {
                        'ultimaActualizacion': datetime.now(),
                        'fuenteDatos': 'export_mongodb.py',
                        'version': '1.0.0'
                    }
                }
                
                # Actualizar o insertar
                if existing:
                    db.expedientes.update_one(
                        {'_id': existing['_id']},
                        {'': expediente_data}
                    )
                    registros_actualizados += 1
                else:
                    db.expedientes.insert_one(expediente_data)
                    registros_creados += 1
                    
            except Exception as e:
                error_msg = f"Error procesando expediente {expediente}: {str(e)}"
                print(error_msg)
                errores.append(error_msg)
        
        # Registrar operación en logs
        db.logs.insert_one({
            'timestamp': datetime.now(),
            'operacion': 'importacion_excel',
            'cliente': cliente,
            'detalles': {
                'archivosAnalizados': 1,
                'registrosCreados': registros_creados,
                'registrosActualizados': registros_actualizados,
                'errores': errores
            }
        })
        
        print(f"Exportación completada:")
        print(f"- Registros creados: {registros_creados}")
        print(f"- Registros actualizados: {registros_actualizados}")
        print(f"- Errores: {len(errores)}")
        
        return registros_creados, registros_actualizados, errores
        
    except Exception as e:
        print(f"Error general en la exportación: {e}")
        return 0, 0, [str(e)]

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python export_mongodb.py ruta/al/excel.xlsx")
        sys.exit(1)
        
    excel_path = sys.argv[1]
    export_to_mongodb(excel_path)
