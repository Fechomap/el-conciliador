import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Search, ChevronLeft, ChevronRight, RefreshCw, Filter, User, FileText, Calendar, Tag } from 'lucide-react';
import { expedientesService } from '../services/api';

// Changed prop name from selectedClient to clienteFilter
const ExpedientesTable = ({ onExpedienteSelect, clienteFilter }) => { 
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
  
  // Estado para filtros (removed cliente from here)
  const [filters, setFilters] = useState({
    tipoServicio: '',
    estadoGeneral: ''
  });
  
  // Removed useEffect that synced selectedClient prop
  
  // Efecto para cargar datos - Added clienteFilter to dependencies
  // Wrapped fetchExpedientes in useCallback to stabilize its reference
  const fetchExpedientes = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    console.log('Fetching expedientes with filter:', clienteFilter, 'and page:', pagination.page);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        // Use clienteFilter prop directly
        ...(clienteFilter && { cliente: clienteFilter }), 
        ...(filters.tipoServicio && { tipoServicio: filters.tipoServicio }),
        ...(filters.estadoGeneral && { estadoGeneral: filters.estadoGeneral })
      };
  
      console.log('Parámetros de búsqueda:', params); // Para depuración
  
      const response = await expedientesService.getExpedientes(params);
  
      if (response.success) {
        setExpedientes(response.data);
        setPagination(prev => ({ // Use functional update for safety
          ...prev,
          totalPages: response.pagination.totalPages,
          total: response.pagination.total
        }));
      } else {
        setError(response.message || 'Error al cargar los datos');
        setExpedientes([]); // Clear data on error
        setPagination(prev => ({ ...prev, totalPages: 0, total: 0 }));
      }
    } catch (err) {
      console.error('Error completo fetchExpedientes:', err);
      setError('Error de conexión al servidor. Intente nuevamente.');
      setExpedientes([]); // Clear data on error
      setPagination(prev => ({ ...prev, totalPages: 0, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, clienteFilter]); // Added clienteFilter dependency

  // useEffect to call the memoized fetch function
  useEffect(() => {
    fetchExpedientes();
  }, [fetchExpedientes]); // Dependency is the stable fetch function reference
  
  // Reset page to 1 when filters (excluding clienteFilter handled by App.jsx) change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters.tipoServicio, filters.estadoGeneral]);

  // Reset page to 1 when the external clienteFilter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [clienteFilter]);
  
  // Función para cambiar de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };
  
  // Función para actualizar filtros (excluding cliente)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    // Page reset is handled by the separate useEffect hook now
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
          {/* Filtro de Cliente REMOVED from table header */}
          
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
                    {/* Make numeroExpediente clickable */}
                    <div 
                      className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                      onClick={() => onExpedienteSelect(expediente._id)} 
                      title={`Ver detalles de ${expediente.numeroExpediente}`}
                    >
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
