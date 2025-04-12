import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
         PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart2, TrendingUp, RefreshCw, FileText, Clock, Check, Tag, Users, Activity } from 'lucide-react';
import { expedientesService } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totales: {
      expedientes: 0,
      facturados: 0,
      pendientes: 0
    },
    tiposServicio: {},
    clientes: []
  });
  
  const [selectedCliente, setSelectedCliente] = useState('');
  
  // Cargar datos al montar el componente
  useEffect(() => {
    fetchEstadisticas();
  }, []);
  
  // Cargar estadísticas
  // Actualizando fetchEstadisticas para utilizar la API real

  const fetchEstadisticas = async () => {
    setLoading(true);
    try {
      // Llamada real a la API utilizando el servicio existente
      const clienteParam = selectedCliente && selectedCliente !== 'todos' ? selectedCliente : null;
      const response = await expedientesService.getEstadisticas(clienteParam);
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.message || 'No se pudieron cargar las estadísticas');
      }
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Transformar datos para gráficos
  const prepareChartData = () => {
    // Datos para gráfico de barras de Tipos de Servicio
    const tiposServicioData = Object.entries(stats.tiposServicio).map(([tipo, cantidad]) => ({
      tipo,
      cantidad
    }));
    
    // Datos para gráfico circular de Estado
    const estadoData = [
      { name: 'Facturados', value: stats.totales.facturados },
      { name: 'Pendientes', value: stats.totales.pendientes }
    ];
    
    // Datos para gráfico de barras de Clientes
    const clientesData = stats.clientes.map(cliente => ({
      nombre: cliente.cliente,
      facturados: cliente.facturados,
      pendientes: cliente.pendientes
    }));
    
    // Datos para tendencia (simulados)
    const tendenciaData = [
      { mes: 'Ene', expedientes: 10 },
      { mes: 'Feb', expedientes: 15 },
      { mes: 'Mar', expedientes: 22 },
      { mes: 'Abr', expedientes: 48 }
    ];
    
    return {
      tiposServicioData,
      estadoData,
      clientesData,
      tendenciaData
    };
  };
  
  // Colores para gráficos
  const ESTADO_COLORS = ['#10B981', '#F59E0B'];
  
  // Preparar datos para gráficos
  const chartData = prepareChartData();
  
  // Componente para tarjeta de estadística
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
  
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            disabled
          >
            <RefreshCw size={16} className="animate-spin text-gray-400" />
          </button>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 rounded-lg h-28"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-100 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      {/* Cabecera */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart2 size={20} className="mr-2 text-gray-500" />
          Dashboard
        </h2>
        <div className="flex gap-3">
          <select
            value={selectedCliente}
            onChange={(e) => setSelectedCliente(e.target.value)}
            className="appearance-none px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los clientes</option>
            {stats.clientes && stats.clientes.map(cliente => (
              <option key={cliente.cliente} value={cliente.cliente}>
                {cliente.cliente}
              </option>
            ))}
          </select>
          <button 
            onClick={fetchEstadisticas}
            className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700"
            title="Recargar datos"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="p-6">
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total de Expedientes" 
            value={stats.totales.expedientes} 
            icon={<FileText size={24} />}
            color="bg-blue-500"
          />
          <StatCard 
            title="Expedientes Facturados" 
            value={stats.totales.facturados} 
            icon={<Check size={24} />}
            color="bg-green-500"
          />
          <StatCard 
            title="Expedientes Pendientes" 
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
              <Tag size={16} className="mr-2" />
              TIPOS DE SERVICIO
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.tiposServicioData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
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
              <Activity size={16} className="mr-2" />
              ESTADO DE EXPEDIENTES
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
          
          {/* Gráfico de Clientes */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
              <Users size={16} className="mr-2" />
              EXPEDIENTES POR CLIENTE
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.clientesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
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
          
          {/* Gráfico de Tendencia */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
              <TrendingUp size={16} className="mr-2" />
              TENDENCIA DE EXPEDIENTES
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData.tendenciaData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="expedientes"
                    stroke="#3B82F6"
                    activeDot={{ r: 8 }}
                  />
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