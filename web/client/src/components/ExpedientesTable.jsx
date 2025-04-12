import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, RefreshCw, Filter, User, FileText, Calendar, Tag, ChevronDown, ChevronUp, Settings, X, Eye, EyeOff } from 'lucide-react';
import { expedientesService } from '../services/api';

// Definición de columnas disponibles basadas en los campos del Excel importado
// Incluimos todos los campos que existen en datosConcentrado y los campos del sistema
const AVAILABLE_COLUMNS = [
  // Columnas principales (visibles por defecto)
  { id: 'numeroExpediente', label: 'Expediente', defaultVisible: true },
  { id: 'cliente', label: 'Cliente', defaultVisible: true },
  { id: 'fechaRegistro', label: 'Fecha Registro', defaultVisible: true },
  { id: 'tipoServicio', label: 'Tipo de Servicio', defaultVisible: true },
  { id: 'estadoGeneral', label: 'Estado', defaultVisible: true },
  { id: 'ultimaActualizacion', label: 'Última Actualización', defaultVisible: true },
  { id: 'destino', label: 'Ubicación Destino', defaultVisible: true },
  { id: 'operador', label: 'Operador', defaultVisible: true },
  { id: 'vehiculo', label: 'Vehículo', defaultVisible: true },
  
  // Campos adicionales (ocultos por defecto)
  { id: 'fechaAsignacion', label: 'Fecha Asignación', defaultVisible: false },
  { id: 'unidadOperativa', label: 'Unidad Operativa', defaultVisible: false },
  { id: 'placas', label: 'Placas', defaultVisible: false },
  { id: 'usuario', label: 'Usuario', defaultVisible: false },
  { id: 'cuenta', label: 'Cuenta', defaultVisible: false },
  { id: 'origen', label: 'Origen', defaultVisible: false },
  { id: 'entreCalles', label: 'Entre Calles', defaultVisible: false },
  { id: 'referencia', label: 'Referencia', defaultVisible: false },
  { id: 'coordenadasOrigen', label: 'Coordenadas Origen', defaultVisible: false },
  { id: 'coordenadasDestino', label: 'Coordenadas Destino', defaultVisible: false },
  { id: 'tipoRecorrido', label: 'Tipo Recorrido', defaultVisible: false },
  { id: 'casetaCobro', label: 'Caseta Cobro', defaultVisible: false },
  { id: 'casetaCubierta', label: 'Caseta Cubierta', defaultVisible: false },
  { id: 'resguardo', label: 'Resguardo', defaultVisible: false },
  { id: 'maniobras', label: 'Maniobras', defaultVisible: false },
  { id: 'horaEspera', label: 'Hora Espera', defaultVisible: false },
  { id: 'parking', label: 'Parking', defaultVisible: false },
  { id: 'otros', label: 'Otros', defaultVisible: false },
  { id: 'excedente', label: 'Excedente', defaultVisible: false },
  { id: 'topeCobertura', label: 'Tope Cobertura', defaultVisible: false },
  { id: 'costoTotal', label: 'Costo Total', defaultVisible: false },
  { id: 'distanciaRecorrido', label: 'Distancia Recorrido', defaultVisible: false },
  { id: 'tiempoRecorrido', label: 'Tiempo Recorrido', defaultVisible: false },
  { id: 'placasGrua', label: 'Placas Grúa', defaultVisible: false },
  { id: 'tipoGrua', label: 'Tipo Grúa', defaultVisible: false },
  { id: 'color', label: 'Color', defaultVisible: false },
  { id: 'ubicacionGruaDin', label: 'Ubicación Grúa', defaultVisible: false },
  { id: 'tiempoArriboDin', label: 'Tiempo Arribo Din', defaultVisible: false },
  { id: 'ta', label: 'TA', defaultVisible: false },
  { id: 'tc', label: 'TC', defaultVisible: false },
  { id: 'tt', label: 'TT', defaultVisible: false },
  { id: 'plano', label: 'Plano', defaultVisible: false },
  { id: 'banderazo', label: 'Banderazo', defaultVisible: false },
  { id: 'costoKm', label: 'Costo Km', defaultVisible: false },
  { id: 'distanciaRecorridoED', label: 'Distancia ED', defaultVisible: false },
  { id: 'tiempoArribo', label: 'Tiempo Arribo', defaultVisible: false },
  { id: 'servicioMuertoED', label: 'Servicio Muerto ED', defaultVisible: false },
  { id: 'servicioMuertoBD', label: 'Servicio Muerto BD', defaultVisible: false },
  { id: 'servicioMuertoBO', label: 'Servicio Muerto BO', defaultVisible: false },
  { id: 'maniobrasAutorizadas', label: 'Maniobras Autorizadas', defaultVisible: false },
  { id: 'facturado', label: 'Facturado', defaultVisible: false }
];

// Componente para seleccionar columnas visibles
const ColumnSelector = ({ visibleColumns, setVisibleColumns }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = (columnId) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        // No permitir ocultar todas las columnas
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const resetToDefaults = () => {
    const defaultColumns = AVAILABLE_COLUMNS
      .filter(col => col.defaultVisible)
      .map(col => col.id);
    setVisibleColumns(defaultColumns);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700 flex items-center"
        title="Configurar columnas"
      >
        <Settings size={16} />
        <span className="ml-1 text-xs hidden sm:inline">Columnas</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium">Configurar columnas</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-2 max-h-60 overflow-y-auto">
            {AVAILABLE_COLUMNS.map(column => (
              <div key={column.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  id={`col-${column.id}`}
                  checked={visibleColumns.includes(column.id)}
                  onChange={() => toggleColumn(column.id)}
                  className="mr-2"
                />
                <label htmlFor={`col-${column.id}`} className="text-sm cursor-pointer flex-grow">
                  {column.label}
                </label>
                {visibleColumns.includes(column.id) ? (
                  <Eye size={14} className="text-blue-500" />
                ) : (
                  <EyeOff size={14} className="text-gray-400" />
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={resetToDefaults}
              className="w-full py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              Restaurar predeterminados
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente principal de la tabla
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
  
  // Estado para filtros
  const [filters, setFilters] = useState({
    tipoServicio: ''
  });

  // Estado para filas expandidas
  const [expandedRows, setExpandedRows] = useState({});

  // Estado para columnas visibles (cargar desde localStorage o usar predeterminadas)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('expedientesTableColumns');
      return saved ? JSON.parse(saved) : AVAILABLE_COLUMNS
        .filter(col => col.defaultVisible)
        .map(col => col.id);
    } catch (e) {
      console.error('Error loading column preferences:', e);
      return AVAILABLE_COLUMNS
        .filter(col => col.defaultVisible)
        .map(col => col.id);
    }
  });

  // Guardar preferencias de columnas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('expedientesTableColumns', JSON.stringify(visibleColumns));
    } catch (e) {
      console.error('Error saving column preferences:', e);
    }
  }, [visibleColumns]);
  
  // Efecto para cargar datos
  const fetchExpedientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('Fetching expedientes with filter:', clienteFilter, 'and page:', pagination.page);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(clienteFilter && { cliente: clienteFilter }), 
        ...(filters.tipoServicio && { tipoServicio: filters.tipoServicio })
      };
  
      console.log('Parámetros de búsqueda:', params);
  
      const response = await expedientesService.getExpedientes(params);
  
      if (response.success) {
        // Log de depuración eliminado
        setExpedientes(response.data);
        setPagination(prev => ({
          ...prev,
          totalPages: response.pagination.totalPages,
          total: response.pagination.total
        }));
      } else {
        setError(response.message || 'Error al cargar los datos');
        setExpedientes([]);
        setPagination(prev => ({ ...prev, totalPages: 0, total: 0 }));
      }
    } catch (err) {
      console.error('Error completo fetchExpedientes:', err);
      setError('Error de conexión al servidor. Intente nuevamente.');
      setExpedientes([]);
      setPagination(prev => ({ ...prev, totalPages: 0, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, clienteFilter]);

  // useEffect para llamar a la función de carga
  useEffect(() => {
    fetchExpedientes();
  }, [fetchExpedientes]);
  
  // Función para añadir dinámicamente columnas de datosConcentrado que no estén en AVAILABLE_COLUMNS
  useEffect(() => {
    if (expedientes.length > 0 && expedientes[0].datosConcentrado) {
      // Obtener todos los campos de datosConcentrado del primer expediente
      const concentradoFields = Object.keys(expedientes[0].datosConcentrado);
      
      // Verificar si hay campos que no están en AVAILABLE_COLUMNS
      const existingColumnIds = AVAILABLE_COLUMNS.map(col => col.id);
      const missingFields = concentradoFields.filter(field => !existingColumnIds.includes(field));
      
      // Si hay campos faltantes, añadirlos a las columnas disponibles
      if (missingFields.length > 0) {
        console.log('Añadiendo campos adicionales de datosConcentrado:', missingFields);
        
        // Crear nuevas columnas para los campos faltantes
        const newColumns = missingFields.map(field => ({
          id: field,
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim(),
          defaultVisible: false
        }));
        
        // Añadir las nuevas columnas a AVAILABLE_COLUMNS
        AVAILABLE_COLUMNS.push(...newColumns);
      }
    }
  }, [expedientes]);
  
  // Reset page to 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters.tipoServicio]);

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
  
  // Función para actualizar filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Función para expandir/colapsar una fila
  const toggleRowExpansion = (expedienteId) => {
    setExpandedRows(prev => ({
      ...prev,
      [expedienteId]: !prev[expedienteId]
    }));
  };
  
  // Función para formatear fecha 
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // Caso 1: Formato DD/MM/YYYY (como el que viene en datosConcentrado.fechaRegistro)
      if (typeof dateString === 'string' && dateString.includes('/')) {
        const [day, month, year] = dateString.split('/').map(Number);
        if (day && month && year) {
          // Los meses en JavaScript son 0-indexed (enero = 0)
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
            return date.toLocaleDateString('es-MX', options);
          }
        }
      }
      
      // Caso 2: Objeto Date o string ISO (como el que puede venir en datos.fechaCreacion)
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString('es-MX', options);
      }
      
      // Si llegamos aquí, la fecha no se pudo parsear
      return 'N/A';
    } catch (error) {
      console.error('Error al formatear fecha:', error, dateString);
      return 'N/A';
    }
  };
  
  // Función para formatear moneda
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
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

  // Función para obtener el valor de una columna (REVISADA)
  const getColumnValue = (expediente, columnId) => {
    // Función para verificar si un valor es válido para mostrar (no undefined, null o vacío)
    const isValid = (value) => value !== undefined && value !== null && value !== '';

    // Obtener valor directamente de datosConcentrado si existe
    const concentradoValue = expediente.datosConcentrado ? expediente.datosConcentrado[columnId] : undefined;

    // --- Manejo específico por columnId ---
    switch (columnId) {
      case 'numeroExpediente':
        // Usar el campo raíz normalizado, fallback al 'numero' original si es necesario
        const numExp = expediente.numeroExpediente;
        const numCon = expediente.datosConcentrado?.numero;
        const displayNum = isValid(numExp) ? numExp : (isValid(numCon) ? String(numCon) : 'N/A');
        return (
          <div
            className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
            onClick={() => onExpedienteSelect(expediente._id)}
            title={`Ver detalles de ${displayNum}`}
          >
            {displayNum}
          </div>
        );

      case 'cliente':
        // Usar el campo raíz normalizado, fallback al 'cliente' original
        const cliExp = expediente.cliente;
        const cliCon = expediente.datosConcentrado?.cliente;
        const displayCli = isValid(cliExp) ? cliExp : (isValid(cliCon) ? String(cliCon).toUpperCase() : 'N/A');
        return (
          <span className="inline-block bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">
            {displayCli}
          </span>
        );

      case 'estadoGeneral':
        // Priorizar 'estatus' de concentrado, fallback a metadatos.estadoGeneral
        const estatusCon = expediente.datosConcentrado?.estatus; // Campo original Excel
        const estadoMeta = expediente.metadatos?.estadoGeneral;
        const displayEstado = isValid(estatusCon) ? String(estatusCon) : (isValid(estadoMeta) ? estadoMeta : 'DESCONOCIDO');
        // Usar el estado determinado para renderizar
        return renderEstado(displayEstado, expediente.metadatos?.facturado);

      case 'ultimaActualizacion':
        // Siempre desde metadatos
        return formatDate(expediente.metadatos?.ultimaActualizacion);

      case 'facturado':
        // Siempre desde metadatos
        return expediente.metadatos?.facturado ? 'Sí' : 'No';

      // --- Casos que dependen principalmente de datosConcentrado ---
      case 'fechaRegistro':
      case 'fechaAsignacion':
        // Intentar formatear el valor de datosConcentrado
        return formatDate(concentradoValue);

      // Campos de costos (intentar formatear como moneda si es número)
      case 'casetaCobro':
      case 'maniobras':
      case 'horaEspera':
      case 'parking':
      case 'otros':
      case 'excedente':
      case 'topeCobertura':
      case 'costoTotal':
      case 'resguardo':
      case 'costoKm':
      case 'banderazo':
        return typeof concentradoValue === 'number' ? formatCurrency(concentradoValue) : (isValid(concentradoValue) ? concentradoValue : 'N/A');

      // Campos de distancia/tiempo (añadir unidad si es número)
      case 'distanciaRecorrido':
      case 'distanciaRecorridoED':
        return typeof concentradoValue === 'number' ? `${concentradoValue} km` : (isValid(concentradoValue) ? concentradoValue : 'N/A');
      case 'tiempoRecorrido':
      case 'tiempoArribo':
      case 'tiempoArriboDin':
        return typeof concentradoValue === 'number' ? `${concentradoValue} min` : (isValid(concentradoValue) ? concentradoValue : 'N/A');

      // --- Default: Devolver valor de datosConcentrado si es válido ---
      default:
        if (isValid(concentradoValue)) {
          // Podríamos añadir más formateo específico aquí si fuera necesario
          return concentradoValue;
        }
        // Como último recurso, intentar buscar en la estructura 'datos' (menos probable que funcione)
        // Esto es opcional y podría eliminarse si 'datos' no se puebla consistentemente
        if (expediente.datos) {
           if (columnId === 'vehiculo' && isValid(expediente.datos.vehiculo?.tipo)) return expediente.datos.vehiculo.tipo;
           if (columnId === 'destino' && isValid(expediente.datos.ubicacion?.destino)) return expediente.datos.ubicacion.destino;
           // Añadir más fallbacks a 'datos' si es relevante
        }

        return 'N/A'; // Si no se encuentra en ningún lado
    }
  };

  // Función para renderizar la vista expandida de una fila
  const renderExpandedRow = (expediente) => {
    // Agrupar campos por categorías
    const categories = [
      {
        title: 'Datos Generales',
        fields: [
          { label: 'Número Expediente', value: expediente.numeroExpediente },
          { label: 'Cliente', value: expediente.cliente },
          { label: 'Fecha Registro', value: formatDate(expediente.datosConcentrado?.fechaRegistro) },
          { label: 'Tipo Servicio', value: expediente.datos?.tipoServicio || expediente.datosConcentrado?.tipoServicio || 'N/A' },
          { label: 'Usuario', value: expediente.datos?.usuario || expediente.datosConcentrado?.usuario || 'N/A' },
          { label: 'Cuenta', value: expediente.datos?.cuenta || expediente.datosConcentrado?.cuenta || 'N/A' }
        ]
      },
      {
        title: 'Ubicación',
        fields: [
          { label: 'Origen', value: expediente.datos?.ubicacion?.origen || expediente.datosConcentrado?.origen || 'N/A' },
          { label: 'Destino', value: expediente.datos?.ubicacion?.destino || expediente.datosConcentrado?.destino || 'N/A' },
          { label: 'Coordenadas Origen', value: expediente.datos?.ubicacion?.coordenadasOrigen || expediente.datosConcentrado?.coordenadasOrigen || 'N/A' },
          { label: 'Coordenadas Destino', value: expediente.datos?.ubicacion?.coordenadasDestino || expediente.datosConcentrado?.coordenadasDestino || 'N/A' },
          { label: 'Entre Calles', value: expediente.datos?.ubicacion?.entreCalles || expediente.datosConcentrado?.entreCalles || 'N/A' },
          { label: 'Referencia', value: expediente.datos?.ubicacion?.referencia || expediente.datosConcentrado?.referencia || 'N/A' }
        ]
      },
      {
        title: 'Vehículo y Operador',
        fields: [
          { label: 'Tipo Vehículo', value: expediente.datos?.vehiculo?.tipo || expediente.datosConcentrado?.tipoVehiculo || 'N/A' },
          { label: 'Placas', value: expediente.datos?.vehiculo?.placas || expediente.datosConcentrado?.placas || 'N/A' },
          { label: 'Color', value: expediente.datos?.vehiculo?.color || expediente.datosConcentrado?.color || 'N/A' },
          { label: 'Operador', value: expediente.datos?.operador || expediente.datosConcentrado?.operador || 'N/A' },
          { label: 'Unidad Operativa', value: expediente.datos?.unidadOperativa || expediente.datosConcentrado?.unidadOperativa || 'N/A' }
        ]
      },
      {
        title: 'Costos',
        fields: [
          { label: 'Caseta Cobro', value: formatCurrency(expediente.datos?.costos?.casetaCobro || expediente.datosConcentrado?.casetaCobro) },
          { label: 'Caseta Cubierta', value: expediente.datos?.costos?.casetaCubierta || expediente.datosConcentrado?.casetaCubierta || 'N/A' },
          { label: 'Maniobras', value: formatCurrency(expediente.datos?.costos?.maniobras || expediente.datosConcentrado?.maniobras) },
          { label: 'Hora Espera', value: formatCurrency(expediente.datos?.costos?.horaEspera || expediente.datosConcentrado?.horaEspera) },
          { label: 'Parking', value: formatCurrency(expediente.datos?.costos?.parking || expediente.datosConcentrado?.parking) },
          { label: 'Otros', value: formatCurrency(expediente.datos?.costos?.otros || expediente.datosConcentrado?.otros) },
          { label: 'Excedente', value: formatCurrency(expediente.datos?.costos?.excedente || expediente.datosConcentrado?.excedente) },
          { label: 'Tope Cobertura', value: formatCurrency(expediente.datos?.costos?.topeCobertura || expediente.datosConcentrado?.topeCobertura) },
          { label: 'Costo Total', value: formatCurrency(expediente.datos?.costos?.costoTotal || expediente.datosConcentrado?.costoTotal) },
          { label: 'Resguardo', value: formatCurrency(expediente.datos?.costos?.resguardo || expediente.datosConcentrado?.resguardo) }
        ]
      },
      {
        title: 'Servicio',
        fields: [
          { label: 'Tipo Recorrido', value: expediente.datos?.servicio?.tipoRecorrido || expediente.datosConcentrado?.tipoRecorrido || 'N/A' },
          { 
            label: 'Distancia Recorrido', 
            value: expediente.datos?.servicio?.distanciaRecorrido 
              ? `${expediente.datos.servicio.distanciaRecorrido} km` 
              : expediente.datosConcentrado?.distanciaRecorrido 
                ? `${expediente.datosConcentrado.distanciaRecorrido} km` 
                : 'N/A' 
          },
          { 
            label: 'Tiempo Recorrido', 
            value: expediente.datos?.servicio?.tiempoRecorrido 
              ? `${expediente.datos.servicio.tiempoRecorrido} min` 
              : expediente.datosConcentrado?.tiempoRecorrido 
                ? `${expediente.datosConcentrado.tiempoRecorrido} min` 
                : 'N/A' 
          },
          { 
            label: 'Tiempo Arribo', 
            value: expediente.datos?.servicio?.tiempoArribo 
              ? `${expediente.datos.servicio.tiempoArribo} min` 
              : expediente.datosConcentrado?.tiempoArribo 
                ? `${expediente.datosConcentrado.tiempoArribo} min` 
                : 'N/A' 
          }
        ]
      },
      {
        title: 'Todos los Datos del Concentrado',
        fields: Object.entries(expediente.datosConcentrado || {})
          // Mostrar todos los campos sin filtrar
          .map(([key, value]) => ({
            label: key,
            value: typeof value === 'string' && value.includes('/') 
              ? formatDate(value) 
              : typeof value === 'number' && ['costo', 'precio', 'monto', 'total', 'cobro', 'maniobras'].some(term => key.toLowerCase().includes(term))
                ? formatCurrency(value)
                : value
          }))
      }
    ];

    return (
      <td colSpan={visibleColumns.length + 1} className="px-6 py-4">
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, idx) => (
              <div key={idx} className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-gray-700 mb-2 border-b pb-1">{category.title}</h4>
                <div className="space-y-1">
                  {category.fields.map((field, fieldIdx) => (
                    <div key={fieldIdx} className="grid grid-cols-2 text-sm">
                      <div className="text-gray-500">{field.label}:</div>
                      <div className="font-medium">{field.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onExpedienteSelect(expediente._id)}
              className="px-3 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 text-sm hover:bg-blue-100"
            >
              Ver detalles completos
            </button>
          </div>
        </div>
      </td>
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
          
          {/* Selector de columnas */}
          <ColumnSelector 
            visibleColumns={visibleColumns} 
            setVisibleColumns={setVisibleColumns} 
          />
          
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
              {/* Columna para expandir/colapsar */}
              <th className="w-10 px-2 py-3 text-center">
                <span className="sr-only">Expandir</span>
              </th>
              
              {/* Columnas dinámicas basadas en visibleColumns */}
              {visibleColumns.map(columnId => {
                const column = AVAILABLE_COLUMNS.find(col => col.id === columnId);
                return (
                  <th 
                    key={columnId}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column?.label || columnId}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Skeleton loader durante la carga
              Array.from({ length: pagination.limit }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  <td className="w-10 px-2 py-4 text-center">
                    <div className="h-4 w-4 bg-gray-200 rounded mx-auto"></div>
                  </td>
                  {visibleColumns.map(columnId => (
                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              // Mensaje de error
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-6 py-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : expedientes.length === 0 ? (
              // Mensaje cuando no hay datos
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron expedientes con los criterios de búsqueda.
                </td>
              </tr>
            ) : (
              // Datos reales con filas expandibles
              expedientes.map((expediente) => (
                <React.Fragment key={expediente._id}>
                  <tr className={`hover:bg-gray-50 ${expandedRows[expediente._id] ? 'bg-blue-50' : ''}`}>
                    {/* Botón para expandir/colapsar */}
                    <td className="w-10 px-2 py-4 text-center">
                      <button
                        onClick={() => toggleRowExpansion(expediente._id)}
                        className={`p-1 rounded-full hover:bg-gray-200 ${expandedRows[expediente._id] ? 'bg-blue-100' : ''}`}
                      >
                        {expandedRows[expediente._id] ? (
                          <ChevronUp size={16} className="text-blue-600" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-500" />
                        )}
                      </button>
                    </td>
                    
                    {/* Columnas dinámicas */}
                    {visibleColumns.map(columnId => (
                      <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                        {getColumnValue(expediente, columnId)}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Fila expandida con todos los datos */}
                  {expandedRows[expediente._id] && (
                    <tr>
                      {renderExpandedRow(expediente)}
                    </tr>
                  )}
                </React.Fragment>
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
