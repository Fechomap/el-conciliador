# Interfaz de Usuario - El Conciliador

Este documento proporciona una visión general de la interfaz de usuario del sistema "El Conciliador", desarrollada como parte de la Fase 4 (Frontend MVP).

## Estructura de Componentes

La aplicación está construida con React y utiliza Tailwind CSS para el estilo. Los componentes principales son:

### 1. App.js
Componente principal que maneja la navegación y estructura general de la aplicación.
- Incluye la barra de navegación superior
- Menú lateral (sidebar)
- Sistema de routing básico

### 2. ExpedientesTable.js
Tabla principal que muestra el listado de expedientes con las siguientes funcionalidades:
- Paginación
- Filtros por cliente, tipo de servicio y estado
- Indicadores visuales de estado
- Carga progresiva con skeleton loaders

### 3. ExpedienteDetail.js
Vista detallada de un expediente individual:
- Información general del expediente
- Tabla de pedidos asociados
- Tabla de facturas asociadas
- Estado y metadatos del expediente

### 4. Dashboard.js
Visualización de estadísticas usando Recharts:
- Tarjetas de resumen con totales
- Gráfico de barras para tipos de servicio
- Gráfico circular para estado (facturado/pendiente)
- Gráfico de barras de clientes
- Gráfico de línea para tendencia temporal

### 5. Servicios API
- `api.js`: Servicios para comunicarse con el backend
- Incluye funciones para expedientes y clientes
- Manejo de errores centralizado

## Tecnologías Utilizadas

- **React**: Biblioteca para la construcción de la interfaz de usuario
- **Tailwind CSS**: Framework de CSS para el diseño
- **Recharts**: Biblioteca para visualizaciones y gráficos
- **Lucide React**: Iconos modernos y accesibles

## Guía de Uso

### Visualización de Expedientes

1. La pantalla principal muestra una tabla con los expedientes
2. Use los filtros en la parte superior para filtrar por cliente, tipo de servicio o estado
3. Navegue entre páginas usando los controles de paginación
4. Haga clic en un expediente para ver sus detalles

### Detalles de Expediente

En la vista de detalles del expediente puede:
- Ver la información general
- Revisar los pedidos asociados
- Verificar las facturas relacionadas
- Volver a la lista con el botón superior izquierdo

### Dashboard

El dashboard proporciona una visión general del sistema:
- Tarjetas de resumen con estadísticas clave
- Gráficos para analizar distribución por tipo, cliente y estado
- Filtro por cliente para análisis específicos

## Implementación y Despliegue

### Estructura de Archivos
```
web/client/
├── src/
│   ├── components/
│   │   ├── ExpedientesTable.js
│   │   ├── ExpedienteDetail.js
│   │   └── Dashboard.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   └── index.js
├── public/
└── package.json
```

### Instalación y Ejecución

1. Instalar dependencias:
```bash
cd web/client
npm install
```

2. Iniciar entorno de desarrollo:
```bash
npm start
```

3. Construir para producción:
```bash
npm run build
```

## Próximos Pasos

Para futuras versiones se planea implementar:
- Autenticación de usuarios
- Filtros avanzados
- Funcionalidad de búsqueda
- Exportación de datos a Excel/PDF
- Mejoras en la visualización móvil