# El Conciliador

Sistema integrado para procesamiento de expedientes y consolidación de información documental.

## Estructura del Proyecto

El proyecto está organizado de forma modular para mantener la independencia funcional de sus componentes:

- **modules/**: Módulos específicos por cliente
  - **ike-processor/**: Procesamiento de PDFs para cliente IKE
  - **other-clients/**: Estructura para futuros clientes

- **core/**: Núcleo del sistema
  - **concentrador/**: Lógica de consolidación de datos
  - **db/**: Capa de acceso a datos (MongoDB)
  - **api/**: API REST interna

- **web/**: Aplicación web para Heroku
  - **server/**: Backend Express.js
  - **client/**: Frontend React

## Requisitos

- Node.js 14+
- Python 3.7+
- MongoDB Atlas
- Cuenta en Heroku

## Configuración Inicial

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` y configurar variables
3. Ejecutar `npm run setup` para instalar dependencias
4. Seguir instrucciones en `docs/setup/` para configuración completa

## Desarrollo

Para iniciar el entorno de desarrollo:

```
npm run dev
```

## Licencia

Propiedad privada, todos los derechos reservados.
