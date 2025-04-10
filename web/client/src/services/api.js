// Archivo: web/client/src/services/api.js

/**
 * Servicio para interactuar con la API REST del backend
 */

// URL base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Realiza una solicitud a la API con manejo de errores
 * @param {string} endpoint - Endpoint a llamar
 * @param {Object} options - Opciones de fetch
 * @returns {Promise<any>} - Respuesta parseada como JSON
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    // Configuración predeterminada para las solicitudes
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    // Combinar opciones predeterminadas con las proporcionadas
    const fetchOptions = { ...defaultOptions, ...options };

    // Realizar la solicitud
    const response = await fetch(url, fetchOptions);

    // Parsear la respuesta JSON
    const data = await response.json();

    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      // Construir un error con los detalles de la respuesta
      const error = new Error(data.message || 'Error en la solicitud');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Reenviar el error para manejarlo en el componente
    throw error;
  }
}

/**
 * Servicio para expedientes
 */
export const expedientesService = {
  /**
   * Obtiene la lista de expedientes con filtros y paginación
   * @param {Object} params - Parámetros de consulta
   * @returns {Promise<Object>} - Datos de expedientes y paginación
   */
  getExpedientes: async (params = {}) => {
    // Construir los parámetros de consulta
    const queryParams = new URLSearchParams();
    
    // Añadir parámetros de paginación
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    // Añadir filtros
    if (params.cliente) queryParams.append('cliente', params.cliente);
    if (params.tipoServicio) queryParams.append('tipoServicio', params.tipoServicio);
    if (params.estadoGeneral) queryParams.append('estadoGeneral', params.estadoGeneral);
    if (params.facturado !== undefined) queryParams.append('facturado', params.facturado);
    
    // Añadir ordenamiento
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    // Construir endpoint con parámetros
    const endpoint = `/expedientes?${queryParams.toString()}`;
    
    return apiRequest(endpoint);
  },

  /**
   * Obtiene los detalles de un expediente por ID
   * @param {string} id - ID del expediente
   * @returns {Promise<Object>} - Datos del expediente
   */
  getExpedienteById: async (id) => {
    return apiRequest(`/expedientes/${id}`);
  },

  /**
   * Obtiene un expediente por su número
   * @param {string} numero - Número de expediente
   * @returns {Promise<Object>} - Datos del expediente
   */
  getExpedienteByNumero: async (numero) => {
    return apiRequest(`/expedientes/numero/${numero}`);
  },

  /**
   * Obtiene expedientes por cliente
   * @param {string} cliente - Código del cliente
   * @param {Object} params - Parámetros adicionales
   * @returns {Promise<Object>} - Datos de expedientes
   */
  getExpedientesByCliente: async (cliente, params = {}) => {
    // Construir los parámetros de consulta
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    // Añadir filtros adicionales
    if (params.tipoServicio) queryParams.append('tipoServicio', params.tipoServicio);
    if (params.facturado !== undefined) queryParams.append('facturado', params.facturado);

    // Construir endpoint con parámetros
    const endpoint = `/expedientes/cliente/${cliente}?${queryParams.toString()}`;
    
    return apiRequest(endpoint);
  },

  /**
   * Obtiene estadísticas generales de expedientes
   * @param {string} cliente - Código del cliente (opcional)
   * @returns {Promise<Object>} - Datos estadísticos
   */
  getEstadisticas: async (cliente = null) => {
    let endpoint = '/expedientes/estadisticas';
    
    if (cliente) {
      endpoint += `?cliente=${cliente}`;
    }
    
    return apiRequest(endpoint);
  }
};

/**
 * Servicio para clientes
 */
export const clientesService = {
  /**
   * Obtiene la lista de todos los clientes
   * @param {boolean} soloActivos - Si true, devuelve solo clientes activos
   * @returns {Promise<Object>} - Datos de clientes
   */
  getClientes: async (soloActivos = true) => {
    const endpoint = `/clientes${soloActivos ? '?activos=true' : ''}`;
    return apiRequest(endpoint);
  },

  /**
   * Obtiene un cliente por su código
   * @param {string} codigo - Código del cliente
   * @returns {Promise<Object>} - Datos del cliente
   */
  getClienteByCodigo: async (codigo) => {
    return apiRequest(`/clientes/codigo/${codigo}`);
  },

  /**
   * Obtiene estadísticas de un cliente
   * @param {string} codigo - Código del cliente
   * @returns {Promise<Object>} - Estadísticas del cliente
   */
  getEstadisticasCliente: async (codigo) => {
    return apiRequest(`/clientes/${codigo}/estadisticas`);
  }
};

// Exportar todos los servicios
export default {
  expedientes: expedientesService,
  clientes: clientesService
};