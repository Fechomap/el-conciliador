# Guía de Instalación: El Conciliador

Esta guía proporciona instrucciones detalladas para instalar y configurar correctamente el sistema El Conciliador, incluyendo todas las dependencias necesarias para Python y Node.js.

## Prerrequisitos

Asegúrate de tener instalado:

- Node.js (v14 o superior)
- Python 3.7 o superior
- npm (viene con Node.js)
- pip (gestor de paquetes de Python)

## Pasos de Instalación

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd el-conciliador
```

### 2. Configuración de Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura las variables necesarias:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tu editor preferido y configura al menos:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@<host>/<database>
MONGODB_DB_NAME=el_conciliador
```

### 3. Instalar Dependencias

Usando el script de instalación automatizado:

```bash
npm run install:deps
```

Este comando instalará:
- Todas las dependencias de Node.js especificadas en `package.json`
- Todas las dependencias de Python especificadas en `requirements.txt`

**Alternativamente, puedes instalar manualmente:**

Para Node.js:
```bash
npm install
```

Para Python:
```bash
pip install -r requirements.txt
```

### 4. Verificar la Instalación

Puedes verificar que todo esté instalado correctamente ejecutando:

```bash
# Probar conexión a MongoDB
npm run test:mongodb

# Probar API REST
npm run test:api
```

## Estructura de Carpetas

El proyecto sigue esta estructura:

```
el-conciliador/
├── core/                      # Núcleo del sistema
├── modules/                   # Módulos específicos
│   └── ike-processor/         # Procesador para IKE
│       ├── PDF-PEDIDOS/       # PDFs de pedidos
│       ├── PDF-FACTURAS/      # PDFs de facturas
│       ├── scripts/           # Scripts de procesamiento
│       └── output/            # Resultados del procesamiento
├── scripts/                   # Scripts de utilidad
├── web/                       # Aplicación web
└── output/                    # Carpeta general de salida
```

## Solución de Problemas

### Error: Cannot find module 'xlsx'

Si ves este error:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'xlsx'
```

Ejecuta:
```bash
npm install xlsx
```

### Error al ejecutar scripts Python

Si tienes problemas al ejecutar scripts Python:

1. Verifica que Python está en tu PATH:
   ```bash
   which python3
   ```

2. Asegúrate de que los permisos son correctos:
   ```bash
   chmod +x modules/ike-processor/scripts/*.py
   ```

### Error de conexión a MongoDB

Si no puedes conectar a MongoDB:

1. Verifica que la URI en el archivo .env es correcta
2. Asegúrate de que tu dirección IP tiene acceso al clúster MongoDB
3. Prueba la conexión:
   ```bash
   npm run test:mongodb
   ```

## Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Procesar Excel a MongoDB
npm run import:excel output/data.xlsx

# Exportar MongoDB a Excel
npm run export:excel output/exported_data.xlsx

# Comparar Excel con MongoDB
npm run compare:excel output/data.xlsx

# Ejecutar pruebas de integración
npm run test:integration
```

## Información Adicional

Para más detalles sobre el proyecto, consulta:
- [README.md](README.md) - Descripción general del proyecto
- [docs/setup/README.md](docs/setup/README.md) - Guía completa de configuración
- [docs/api/README.md](docs/api/README.md) - Documentación de la API REST