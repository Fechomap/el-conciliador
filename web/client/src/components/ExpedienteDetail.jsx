import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Truck, Calendar, DollarSign, ClipboardList, Tag, User, Package, Clock, RefreshCw } from 'lucide-react';

const ExpedienteDetail = ({ expedienteId, onBack }) => {
  const [expediente, setExpediente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (expedienteId) {
      fetchExpedienteDetail(expedienteId);
    }
  }, [expedienteId]);

  const fetchExpedienteDetail = async (id) => {
    setLoading(true);
    try {
      // Simular carga de datos desde la API
      setTimeout(() => {
        const mockExpediente = {
          _id: id,
          numeroExpediente: "12345678",
          cliente: "IKE",
          datos: {
            fechaCreacion: "2024-04-01",
            tipoServicio: "ARRASTRE",
            descripcion: "Servicio de arrastre para vehículo en carretera federal"
          },
          pedidos: [
            {
              numeroPedido: "1234567890",
              numeroLinea: 1,
              fechaPedido: "2024-04-02",
              precio: 1500.00,
              estatus: "FACTURADO",
              factura: "F001"
            },
            {
              numeroPedido: "1234567891",
              numeroLinea: 2,
              fechaPedido: "2024-04-03",
              precio: 300.00,
              estatus: "FACTURADO",
              factura: "F001"
            }
          ],
          facturas: [
            {
              numeroFactura: "F001",
              fechaFactura: "2024-04-05",
              monto: 1800.00
            }
          ],
          metadatos: {
            ultimaActualizacion: "2024-04-08",
            fuenteDatos: "extract.py",
            version: "1.0.0",
            estadoGeneral: "COMPLETO",
            facturado: true,
            esDuplicado: false,
            esUnico: true,
            procesadoPorConcentrador: true,
            ultimaActualizacionConcentrador: "2024-04-09"
          }
        };
        
        setExpediente(mockExpediente);
        setLoading(false);
      }, 800);
      
    } catch (err) {
      setError('Error al cargar los detalles del expediente');
      setLoading(false);
      console.error('Error fetching expediente details:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-MX', options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/5"></div>
            </div>
            <div className="h-32 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={16} className="mr-1" />
            Volver
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!expediente) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={16} className="mr-1" />
            Volver
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          No se encontró información para este expediente.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Cabecera */}
      <div className="border-b border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 p-1 rounded-full hover:bg-gray-100"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText size={18} className="mr-2 text-gray-500" />
              Expediente: {expediente.numeroExpediente}
            </h2>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <User size={14} className="mr-1" /> 
              Cliente: {expediente.cliente}
              <Clock size={14} className="ml-3 mr-1" /> 
              Actualizado: {formatDate(expediente.metadatos?.ultimaActualizacion)}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            expediente.metadatos?.estadoGeneral === 'COMPLETO' 
              ? 'bg-green-100 text-green-800' 
              : expediente.metadatos?.estadoGeneral === 'PENDIENTE'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
          }`}>
            {expediente.metadatos?.estadoGeneral || 'DESCONOCIDO'}
          </div>
          <button 
            onClick={() => fetchExpedienteDetail(expedienteId)}
            className="p-1 rounded-full hover:bg-gray-100"
            title="Recargar datos"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-6">
        {/* Información general */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <Truck size={16} className="mr-2" />
              DATOS DEL SERVICIO
            </h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500">Tipo de Servicio</div>
                  <div className="font-medium">{expediente.datos?.tipoServicio || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Fecha de Creación</div>
                  <div className="font-medium">{formatDate(expediente.datos?.fechaCreacion)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Descripción</div>
                  <div className="font-medium">{expediente.datos?.descripcion || 'Sin descripción'}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <Tag size={16} className="mr-2" />
              METADATOS
            </h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500">Estado</div>
                  <div className="font-medium">{expediente.metadatos?.estadoGeneral || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Facturado</div>
                  <div className="font-medium">{expediente.metadatos?.facturado ? 'Sí' : 'No'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Fuente de Datos</div>
                  <div className="font-medium">{expediente.metadatos?.fuenteDatos || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Última Actualización</div>
                  <div className="font-medium">{formatDate(expediente.metadatos?.ultimaActualizacion)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pedidos */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
            <ClipboardList size={16} className="mr-2" />
            PEDIDOS ({expediente.pedidos?.length || 0})
          </h3>
          
          {expediente.pedidos?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factura
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expediente.pedidos.map((pedido) => (
                    <tr key={pedido.numeroPedido} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{pedido.numeroPedido}</div>
                        <div className="text-xs text-gray-500">Línea: {pedido.numeroLinea}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(pedido.fechaPedido)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(pedido.precio)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          pedido.estatus === 'FACTURADO' 
                            ? 'bg-green-100 text-green-800' 
                            : pedido.estatus === 'FACTURADO POR EXPEDIENTE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {pedido.estatus}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {pedido.factura || 'Sin factura'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 text-center text-gray-500 rounded-md">
              No hay pedidos registrados para este expediente.
            </div>
          )}
        </div>

        {/* Facturas */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
            <DollarSign size={16} className="mr-2" />
            FACTURAS ({expediente.facturas?.length || 0})
          </h3>
          
          {expediente.facturas?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número de Factura
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expediente.facturas.map((factura) => (
                    <tr key={factura.numeroFactura} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {factura.numeroFactura}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(factura.fechaFactura)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(factura.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 text-center text-gray-500 rounded-md">
              No hay facturas registradas para este expediente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpedienteDetail;