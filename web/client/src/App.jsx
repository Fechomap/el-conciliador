import React, { useState } from 'react';
import ExpedientesTable from './components/ExpedientesTable';
import ExpedienteDetail from './components/ExpedienteDetail';
import Dashboard from './components/Dashboard';
import { FileText, BarChart2, Search, Menu, X, LogOut, User, Bell, Home } from 'lucide-react';

const App = () => {
  // Estado para gestionar la vista activa
  const [activeView, setActiveView] = useState('expedientes');
  
  // Estado para el expediente seleccionado
  const [selectedExpedienteId, setSelectedExpedienteId] = useState(null);
  
  // Estado para abrir/cerrar menú móvil
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Estado para el filtro de cliente (aplicado a la tabla)
  const [clienteFilter, setClienteFilter] = useState(null); // Renamed from selectedClient
  
  // Función para manejar la selección de un expediente
  const handleExpedienteSelect = (id) => {
    setSelectedExpedienteId(id);
    setActiveView('expediente-detail');
  };
  
  // Función para volver a la lista de expedientes
  const handleBackToList = () => {
    setSelectedExpedienteId(null);
    setActiveView('expedientes');
  };
  
  // Función para cambiar de vista
  const handleChangeView = (view) => {
    setActiveView(view);
    setMenuOpen(false); // Cerrar menú móvil al cambiar de vista
  };

  // Función para manejar la selección de un cliente desde el sidebar del Dashboard
  const handleClienteFilterChange = (cliente) => {
    console.log('Filtro de cliente cambiado a:', cliente); // Para depuración
    setClienteFilter(cliente); // cliente será null si se selecciona 'Mostrar Todos'

    // Si estamos viendo detalles, volver a la tabla al aplicar filtro
    if (activeView === 'expediente-detail') {
      setSelectedExpedienteId(null);
      setActiveView('expedientes'); 
    }
    // Cambiar a la vista de expedientes si no estamos ya ahí o en el dashboard
    if (activeView !== 'expedientes' && activeView !== 'dashboard') {
       setActiveView('expedientes');
    }
  };
  
  // Renderizar contenido según la vista activa
  const renderContent = () => {
    switch (activeView) {
      case 'expediente-detail':
        return (
          <ExpedienteDetail
            expedienteId={selectedExpedienteId}
            onBack={handleBackToList}
          />
        );
      case 'dashboard':
        // Pass filter state and handler to Dashboard
        return <Dashboard 
                 selectedClient={clienteFilter} // Pass current filter for stats dropdown sync
                 activeClienteFilter={clienteFilter} // Pass filter to highlight sidebar button
                 onClienteSelect={handleClienteFilterChange} // Pass handler for sidebar clicks
               />; 
      case 'expedientes':
      default:
        return (
          <ExpedientesTable 
            onExpedienteSelect={handleExpedienteSelect} 
            clienteFilter={clienteFilter} // Pass the filter state to the table
          />
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra de navegación superior */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">El Conciliador</span>
              </div>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {/* Barra de búsqueda */}
              <div className="relative mx-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar expediente..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              {/* Íconos de la derecha */}
              <button
                type="button"
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="sr-only">Ver notificaciones</span>
                <Bell className="h-6 w-6" />
              </button>
              
              {/* Avatar del usuario */}
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User size={18} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botón de menú móvil */}
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">Abrir menú principal</span>
                {menuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Menú móvil */}
      {menuOpen && (
        <div className="sm:hidden bg-white shadow-md">
          <div className="pt-2 pb-3 space-y-1">
            <button
              onClick={() => handleChangeView('expedientes')}
              className={`${
                activeView === 'expedientes'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left`}
            >
              <div className="flex items-center">
                <FileText size={18} className="mr-3" />
                Expedientes
              </div>
            </button>
            <button
              onClick={() => handleChangeView('dashboard')}
              className={`${
                activeView === 'dashboard'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left`}
            >
              <div className="flex items-center">
                <BarChart2 size={18} className="mr-3" />
                Dashboard
              </div>
            </button>
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <User size={20} />
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">Usuario Demo</div>
                <div className="text-sm font-medium text-gray-500">usuario@ejemplo.com</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
              >
                <div className="flex items-center">
                  <LogOut size={18} className="mr-3" />
                  Cerrar sesión
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Menú lateral (visible en pantallas md y superiores) */}
          <div className="hidden md:block w-64 bg-white rounded-lg shadow">
            <div className="px-3 py-4">
              <div className="space-y-1">
                <button
                  onClick={() => handleChangeView('expedientes')}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                    activeView === 'expedientes'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <FileText 
                    size={20} 
                    className={`mr-3 ${activeView === 'expedientes' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} 
                  />
                  Expedientes
                </button>
                <button
                  onClick={() => handleChangeView('dashboard')}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                    activeView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <BarChart2 
                    size={20} 
                    className={`mr-3 ${activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} 
                  />
                  Dashboard
                </button>
              </div>
              {/* Sección de Clientes eliminada del sidebar principal */}
              {/* La lógica de filtro de clientes ahora está dentro del Dashboard */}
            </div>
          </div>
          
          {/* Contenido principal */}
          <div className="flex-1">
            {renderContent()}
            
            {/* Pie de página simple (versión) */}
            <div className="mt-6 text-center text-sm text-gray-500">
              El Conciliador v1.0.0 | &copy; 2025
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
