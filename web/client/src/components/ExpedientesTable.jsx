import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, RefreshCw, Filter, User, FileText, Calendar, Tag } from 'lucide-react';

const ExpedientesTable = () => {
  // Estado para los datos
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
    total: 0
  });
  
  // Estado para filtros
  const [filters, setFilters] = useState({
    cliente: '',
    tipoServicio: '',
    estadoGeneral: ''
  });
  
  // Efecto para cargar datos
  useEffect(() => {
    fetchExpedientes();
  }, [pagination.page, pagination.limit, filters]);
  
  // Función para obtener datos de la API
  const fetchExpedientes = async () => {
    setLoading(true);
    try {
      // Construir URL con parámetros de paginación y filtros
      let url = `/api/expedientes?page=${pagination.page}&limit=${pagination.limit}`;
      
      // Añadir filtros a la URL si están definidos
      if (filters.cliente) url += `&cliente=${filters.cliente}`;
      if (filters.tipoServicio) url += `&tipoServicio=${filters.tipoServicio}`;
      if (filters.estadoGeneral) url += `&estadoGeneral=${filters.estadoGeneral}`;
      
      // Simular respuesta de la API para desarrollo
      // En producción, se reemplazaría por un fetch real a la API
      setTimeout(() => {
        // Datos de ejemplo
        const response = {
          success: true,
          data: [
            {
              _id: '1',
              numeroExpediente: '12345678',
              cliente: 'IKE',
              datos: {
                fechaCreacion: '2024-04-01',
                tipoServicio: 'ARRASTRE'
              },
              metadatos: {
                estadoGeneral: 'COMPLETO',
                facturado: true,
                ultimaActualizacion: '2024-04-08'
              }
            },
            {
              _id: '2',
              numeroExpediente: '87654321',
              cliente: 'DEMO',
              datos: {
                fechaCreacion: '2024-03-15',
                tipoServicio: 'GRUA'
              },
              metadatos: {
                estadoGeneral: 'PENDIENTE',
                facturado: false,
                ultimaActualizacion: '2024-03-20'
              }
            },
            {
              _id: '3',
              numeroExpediente: '11223344',
              cliente: 'IKE',
              datos: {
                fechaCreacion: '2024-03-28',
                tipoServicio: 'SALVAMENTO'
              },
              metadatos: {
                estadoGeneral: 'PARCIAL',
                facturado: true,
                ultimaActualizacion: '2024-04-05'
              }
            },
            {
              _id: '4',
              numeroExpediente: '55667788',
              cliente: 'DEMO',
              datos: {
                fechaCreacion: '2024-02-10',
                tipoServicio: 'TRASLADO'
              },
              metadatos: {
                estadoGeneral: 'COMPLETO',
                facturado: true,
                ultimaActualizacion: '2024-03-01'
              }
            },
            {
              _id: '5',
              numeroExpediente: '99887766',
              cliente: 'IKE',
              datos: {
                fechaCreacion: '2024-01-20',
                tipoServicio: 'ARRASTRE'
              },
              metadatos: {
                estadoGeneral: 'PENDIENTE',
                facturado: false,
                ultimaActualizacion: '2024-02-15'
              }
            }
          ],
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            totalPages: 10,
            total: 48
          }
        };
        
        setExpedientes(response.data);
        setPagination({
          ...pagination,
          totalPages: response.pagination.totalPages,
          total: response.pagination.total
        });
        setLoading(false);
      }, 500);
      
    } catch (err) {
      setError('Error al cargar los expedientes');
      setLoading(false);
      console.error('Error fetching expedientes:', err);
    }
  };
  
  // Función para cambiar de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };
  
  // Función para actualizar filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    // Reiniciar a la primera página cuando se aplica un filtro
    setPagination({ ...pagination, page: 1 });
  };
  
  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-MX', options);
  };
  
  // Función para renderizar el indicador de estado
  const renderEstado = (estado, facturado) => {
    let bgColor = 'bg-gray-200'; // Default
    let textColor = 'text-gray-700';
    
    if (estado === 'COMPLETO') {
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
    } else if (estado === 'PENDIENTE') {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
    } else if (estado === 'PARCIAL') {
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {estado || 'DESCONOCIDO'}
      </span>
    );
  };
  
  return (
    <div className="bg-white shadow rounded-lg">
      {/* Barra superior con filtros */}
      <div className="border-b border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Expedientes</h2>
          <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-1">
            {pagination.total} registros
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Filtro de Cliente */}
          <div className="relative flex items-center">
            <select
              name="cliente"
              value={filters.cliente}
              onChange={handleFilterChange}
              className="appearance-none pl-8 pr-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los clientes</option>
              <option value="IKE">IKE</option>
              <option value="DEMO">DEMO</option>
            </select>
            <User size={16} className="absolute left-2 text-gray-400" />
          </div>
          
          {/* Filtro de Tipo de Servicio */}
          <div className="relative flex items-center">
            <select
              name="tipoServicio"
              value={filters.tipoServicio}
              onChange={handleFilterChange}
              className="appearance-none pl-8 pr-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los servicios</option>
              <option value="ARRASTRE">Arrastre</option>
              <option value="GRUA">Grúa</option>
              <option value="SALVAMENTO">Salvamento</option>
              <option value="TRASLADO">Traslado</option>
            </select>
            <Tag size={16} className="absolute left-2 text-gray-400" />
          </div>
          
          {/* Filtro de Estado */}
          <div className="relative flex items-center">
            <select
              name="estadoGeneral"
              value={filters.estadoGeneral}
              onChange={handleFilterChange}
              className="appearance-none pl-8 pr-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="COMPLETO">Completo</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Parcial</option>
            </select>
            <FileText size={16} className="absolute left-2 text-gray-400" />
          </div>
          
          {/* Botón para recargar */}
          <button
            onClick={fetchExpedientes}
            className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700"
            title="Recargar datos"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Tabla de expedientes */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expediente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo de Servicio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última Actualización
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Skeleton loader durante la carga
              Array.from({ length: pagination.limit }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                </tr>
              ))
            ) : error ? (
              // Mensaje de error
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : expedientes.length === 0 ? (
              // Mensaje cuando no hay datos
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No se encontraron expedientes con los criterios de búsqueda.
                </td>
              </tr>
            ) : (
              // Datos reales
              expedientes.map((expediente) => (
                <tr key={expediente._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-blue-600 hover:text-blue-800">
                      {expediente.numeroExpediente}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">
                      {expediente.cliente}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(expediente.datos?.fechaCreacion)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expediente.datos?.tipoServicio || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderEstado(
                      expediente.metadatos?.estadoGeneral,
                      expediente.metadatos?.facturado
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(expediente.metadatos?.ultimaActualizacion)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              pagination.page <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Anterior
          </button>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              pagination.page >= pagination.totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">
                {expedientes.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
              </span>{' '}
              a{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              de <span className="font-medium">{pagination.total}</span> resultados
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                  pagination.page <= 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Anterior</span>
                <ChevronLeft size={18} />
              </button>
              
              {/* Números de página */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                // Lógica para mostrar páginas alrededor de la actual
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pagination.page === pageNum
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                  pagination.page >= pagination.totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Siguiente</span>
                <ChevronRight size={18} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpedientesTable;