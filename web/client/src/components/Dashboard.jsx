import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
         PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart2, TrendingUp, RefreshCw, FileText, Clock, Check, Tag, Users, Activity } from 'lucide-react';
import { expedientesService } from '../services/api';

// Dashboard component with client filtering removed and moved to App.jsx
const Dashboard = ({ selectedClient, activeClienteFilter, onClienteSelect }) => { 
  // State for statistics and loading
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);
  
  // State for client list in dropdown
  const [clientesList, setClientesList] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState(null);
  
  // State for statistics data
  const [stats, setStats] = useState({
    totales: { expedientes: 0, facturados: 0, pendientes: 0 },
    tiposServicio: {},
    clientes: [] 
  });
  
  // State for the statistics dropdown filter
  const [selectedClienteStats, setSelectedClienteStats] = useState(selectedClient || 'todos');

  // Sync selectedClient prop with internal state
  useEffect(() => {
    setSelectedClienteStats(selectedClient || 'todos');
  }, [selectedClient]);

  // Fetch unique client list for the dropdown
  useEffect(() => {
    const fetchClientes = async () => {
      setLoadingClientes(true);
      setErrorClientes(null);
      
      try {
        const response = await expedientesService.getClientes();
        
        if (Array.isArray(response)) {
          const validClients = response.filter(c => c).sort();
          setClientesList(['todos', ...validClients]);
        } else {
          console.error("API did not return an array of clients:", response);
          setClientesList(['todos']);
          setErrorClientes('La respuesta de la API de clientes no es válida.');
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
        setErrorClientes('Error al cargar la lista de clientes.');
        setClientesList(['todos']);
      } finally {
        setLoadingClientes(false);
      }
    };
    
    fetchClientes();
  }, []);

  // Function to fetch statistics
  const fetchEstadisticas = async () => {
    setLoadingStats(true);
    setErrorStats(null);
    
    try {
      const clienteParam = selectedClienteStats && selectedClienteStats !== 'todos' 
        ? selectedClienteStats 
        : null;
      
      console.log('Obteniendo estadísticas para cliente:', clienteParam);
      
      const response = await expedientesService.getEstadisticas(clienteParam);
      
      if (response.success) {
        setStats(response.data);
      } else {
        setErrorStats(response.message || 'No se pudieron cargar las estadísticas');
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
      setErrorStats('Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch stats when dropdown selection changes
  useEffect(() => {
    fetchEstadisticas();
  }, [selectedClienteStats]);

  // Prepare chart data from stats
  const prepareChartData = () => {
    const tiposServicioData = Object.entries(stats.tiposServicio || {}).map(([tipo, cantidad]) => ({ 
      tipo, 
      cantidad 
    }));
    
    const estadoData = [
      { name: 'Facturados', value: stats.totales.facturados },
      { name: 'Pendientes', value: stats.totales.pendientes }
    ];
    
    const clientesData = (stats.clientes || []).map(cliente => ({
      nombre: cliente.cliente,
      facturados: cliente.facturados,
      pendientes: cliente.pendientes
    }));
    
    const tendenciaData = [
      { mes: 'Ene', expedientes: 10 },
      { mes: 'Feb', expedientes: 15 },
      { mes: 'Mar', expedientes: 22 },
      { mes: 'Abr', expedientes: 48 }
    ];
    
    return { tiposServicioData, estadoData, clientesData, tendenciaData };
  };
  
  const ESTADO_COLORS = ['#10B981', '#F59E0B'];
  const chartData = prepareChartData();

  // StatCard Component
  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`h-12 w-12 rounded-full ${color} flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );

  // Loading State
  if (loadingStats) {
    return (
      <div className="bg-white shadow rounded-lg p-6 animate-pulse">
        <div className="flex justify-between items-center mb-6 border-b pb-4"> 
          <div className="h-7 bg-gray-300 rounded w-1/3"></div>
          <div className="flex gap-3 items-center">
            <div className="h-4 bg-gray-300 rounded w-16"></div>
            <div className="h-9 bg-gray-300 rounded w-32"></div>
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
          </div>
        </div>
         
        {/* Stats placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => <div key={i} className="bg-gray-200 rounded-lg h-28"></div>)}
        </div>
         
        {/* Charts placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="bg-gray-200 rounded-lg h-64"></div>)}
        </div>
      </div>
    );
  }

  // Error State
  if (errorStats) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errorStats || 'Ocurrió un error al cargar las estadísticas.'}
        </div>
      </div>
    );
  }
  
  // Main Render (Data Loaded Successfully)
  return (
    <div className="bg-white shadow rounded-lg overflow-y-auto"> 
      {/* Cabecera del Dashboard */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart2 size={20} className="mr-2 text-gray-500" />
          Estadísticas {selectedClienteStats && selectedClienteStats !== 'todos' ? `(${selectedClienteStats})` : '(Generales)'}
        </h2>
        
        <div className="flex gap-3 items-center">
          {/* Dropdown para filtrar SOLO las estadísticas */}
          <span className="text-xs text-gray-500">Filtrar Stats:</span>
          <select
            value={selectedClienteStats}
            onChange={(e) => setSelectedClienteStats(e.target.value)}
            className="appearance-none px-3 py-1.5 border border-gray-300 bg-white rounded-md shadow-sm text-sm focus:outline-none focus:border-blue-500"
          >
            {clientesList.map(cliente => ( 
              <option key={cliente} value={cliente}>
                {cliente === 'todos' ? 'Todos los clientes' : cliente}
              </option>
            ))}
          </select>
            
          <button 
            onClick={fetchEstadisticas}
            className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700"
            title="Recargar estadísticas"
            disabled={loadingStats}
          >
            {loadingStats ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>
      
      {/* Contenido principal del Dashboard */}
      <div className="p-6">
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total Expedientes" 
            value={stats.totales.expedientes} 
            icon={<FileText size={24} />} 
            color="bg-blue-500" 
          />
          <StatCard 
            title="Facturados" 
            value={stats.totales.facturados} 
            icon={<Check size={24} />} 
            color="bg-green-500" 
          />
          <StatCard 
            title="Pendientes" 
            value={stats.totales.pendientes} 
            icon={<Clock size={24} />} 
            color="bg-yellow-500" 
          />
        </div>
      
        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfico de Tipos de Servicio */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
              <Tag size={16} className="mr-2" /> TIPOS DE SERVICIO
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.tiposServicioData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        
          {/* Gráfico de Estado */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
              <Activity size={16} className="mr-2" /> ESTADO DE EXPEDIENTES
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData.estadoData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    outerRadius={80} 
                    fill="#8884d8" 
                    dataKey="value" 
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.estadoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ESTADO_COLORS[index % ESTADO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        
          {/* Gráfico de Clientes (Only shown if 'todos' is selected in dropdown) */}
          {(!selectedClienteStats || selectedClienteStats === 'todos') && stats.clientes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
                <Users size={16} className="mr-2" /> EXPEDIENTES POR CLIENTE (General)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.clientesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="facturados" name="Facturados" fill="#10B981" />
                    <Bar dataKey="pendientes" name="Pendientes" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        
          {/* Gráfico de Tendencia (Simulado) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
              <TrendingUp size={16} className="mr-2" /> TENDENCIA DE EXPEDIENTES
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.tendenciaData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="expedientes" stroke="#3B82F6" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;