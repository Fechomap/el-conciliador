import React, { useState, useRef } from 'react';
import { Upload, Files, ArrowUpCircle, FileCheck, CheckCircle, AlertCircle, RefreshCw, Database } from 'lucide-react';

export default function FileProcessingPanel() {
  const [orderPdfs, setOrderPdfs] = useState([]);
  const [invoicePdfs, setInvoicePdfs] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  const orderInputRef = useRef(null);
  const invoiceInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // Manejadores para selección de archivos
  const handleOrderPdfsSelect = (e) => {
    const files = Array.from(e.target.files);
    setOrderPdfs(files);
  };

  const handleInvoicePdfsSelect = (e) => {
    const files = Array.from(e.target.files);
    setInvoicePdfs(files);
  };

  const handleExcelFileSelect = (e) => {
    const file = e.target.files[0];
    setExcelFile(file);
  };

  // Función para procesar PDFs
  const processPdfs = async () => {
    if ((orderPdfs.length === 0 && invoicePdfs.length === 0) && !excelFile) {
      setError("Por favor seleccione al menos un archivo para procesar");
      return;
    }

    setProcessing(true);
    setCurrentStep("preparing");
    setError(null);
    setResults(null);
    setCurrentStep("uploading"); // Indicate start of processing

    try {
      // Crear FormData para enviar archivos
      const formData = new FormData();

      // Agregar PDFs de pedidos (usando la clave 'pedidosPdfs' que espera el backend)
      orderPdfs.forEach(file => {
        formData.append('pedidosPdfs', file, file.name); // Asegurar nombre original
      });

      // Agregar PDFs de facturas (usando la clave 'facturasPdfs')
      invoicePdfs.forEach(file => {
        formData.append('facturasPdfs', file, file.name); // Asegurar nombre original
      });

      // Agregar Excel si existe (usando la clave 'excelFile')
      if (excelFile) {
        formData.append('excelFile', excelFile, excelFile.name); // Asegurar nombre original
      }

      // --- Llamada real a la API ---
      console.log('Enviando archivos a /api/procesar-archivos...');
      console.log('Pedidos PDFs:', orderPdfs.map(f => f.name));
      console.log('Facturas PDFs:', invoicePdfs.map(f => f.name));
      console.log('Excel:', excelFile ? excelFile.name : 'Ninguno');
      
      let result;
      
      try {
        const response = await fetch('/api/procesar-archivos', {
          method: 'POST',
          body: formData,
          // No establecer 'Content-Type', el navegador lo hará por FormData
        });
        
        console.log('Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
          console.error('Error en la respuesta:', response.status, response.statusText);
          throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }
        
        result = await response.json();
        console.log('Resultado:', result);
        
        if (!result.success) {
          throw new Error(result.message || 'Error desconocido');
        }
      } catch (error) {
        console.error('Error al procesar la respuesta:', error);
        throw error;
      }

      // Mostrar mensaje de éxito (podríamos mostrar más detalles si el backend los devuelve)
      setResults({
        message: result?.message || "Archivos procesados con éxito.",
        // Podríamos añadir más detalles aquí si el backend los devuelve
        processedFiles: orderPdfs.length + invoicePdfs.length + (excelFile ? 1 : 0),
      });
      // Limpiar formularios después del éxito
      setOrderPdfs([]);
      setInvoicePdfs([]);
      setExcelFile(null);
      if (orderInputRef.current) orderInputRef.current.value = '';
      if (invoiceInputRef.current) invoiceInputRef.current.value = '';
      if (excelInputRef.current) excelInputRef.current.value = '';


    } catch (err) {
      console.error("Error processing files:", err);
      setError(err.message || "Ha ocurrido un error durante el procesamiento. Verifique la consola del servidor para más detalles.");
    } finally {
      setProcessing(false);
      setCurrentStep(null); // Reset step indicator
    }
  };

  // Función para reiniciar el proceso
  const resetProcess = () => {
    setOrderPdfs([]);
    setInvoicePdfs([]);
    setExcelFile(null);
    setResults(null);
    setError(null);
    
    // Reiniciar inputs
    if (orderInputRef.current) orderInputRef.current.value = '';
    if (invoiceInputRef.current) invoiceInputRef.current.value = '';
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Panel Header */}
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
        <h2 className="text-lg font-semibold text-blue-800 flex items-center">
          <Upload className="mr-2" size={20} />
          Carga y Procesamiento de Archivos
        </h2>
        <p className="text-sm text-blue-600 mt-1">
          Suba PDFs de pedidos, facturas o un archivo Excel para procesarlos e integrarlos en el sistema
        </p>
      </div>
      
      {/* Panel Content */}
      <div className="p-6">
        {!processing && !results ? (
          <div className="space-y-6">
            {/* PDF de Pedidos */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center text-gray-700 mb-3">
                <Files size={20} className="text-blue-500 mr-2" />
                <h3 className="font-medium">PDFs de Pedidos de Compra</h3>
              </div>
              
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${orderPdfs.length > 0 ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ArrowUpCircle size={35} className={`mb-3 ${orderPdfs.length > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Haga clic para seleccionar</span> o arrastre y suelte
                      </p>
                      <p className="text-xs text-gray-500">PDFs de pedidos de compra (*.pdf)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept=".pdf"
                      ref={orderInputRef}
                      onChange={handleOrderPdfsSelect} 
                    />
                  </label>
                </div>
                
                {orderPdfs.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileCheck size={16} className="text-green-500 mr-1" />
                      <span>{orderPdfs.length} archivo{orderPdfs.length !== 1 ? 's' : ''} seleccionado{orderPdfs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-1 max-h-20 overflow-y-auto text-xs text-gray-500">
                      {orderPdfs.map((file, index) => (
                        <div key={index} className="truncate">{file.name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* PDF de Facturas */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center text-gray-700 mb-3">
                <Files size={20} className="text-indigo-500 mr-2" />
                <h3 className="font-medium">PDFs de Facturas</h3>
              </div>
              
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${invoicePdfs.length > 0 ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ArrowUpCircle size={35} className={`mb-3 ${invoicePdfs.length > 0 ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Haga clic para seleccionar</span> o arrastre y suelte
                      </p>
                      <p className="text-xs text-gray-500">PDFs de facturas (*.pdf)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept=".pdf"
                      ref={invoiceInputRef}
                      onChange={handleInvoicePdfsSelect} 
                    />
                  </label>
                </div>
                
                {invoicePdfs.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileCheck size={16} className="text-green-500 mr-1" />
                      <span>{invoicePdfs.length} archivo{invoicePdfs.length !== 1 ? 's' : ''} seleccionado{invoicePdfs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-1 max-h-20 overflow-y-auto text-xs text-gray-500">
                      {invoicePdfs.map((file, index) => (
                        <div key={index} className="truncate">{file.name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Excel para importación directa */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center text-gray-700 mb-3">
                <Database size={20} className="text-green-500 mr-2" />
                <h3 className="font-medium">Archivo Excel para Importación</h3>
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Opcional</span>
              </div>
              
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer ${excelFile ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}>
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <ArrowUpCircle size={30} className={`mb-2 ${excelFile ? 'text-green-500' : 'text-gray-400'}`} />
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold">Excel de datos procesados (*.xlsx)</span>
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls"
                      ref={excelInputRef}
                      onChange={handleExcelFileSelect} 
                    />
                  </label>
                </div>
                
                {excelFile && (
                  <div className="mt-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileCheck size={16} className="text-green-500 mr-1" />
                      <span>Archivo seleccionado: {excelFile.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg mr-3"
                onClick={resetProcess}
              >
                Limpiar
              </button>
              <button
                className={`bg-blue-600 text-white py-2 px-6 rounded-lg flex items-center ${processing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                onClick={processPdfs}
                disabled={processing || (orderPdfs.length === 0 && invoicePdfs.length === 0 && !excelFile)}
              >
                {processing ? (
                  <>
                    <RefreshCw size={18} className="mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload size={18} className="mr-2" />
                    Procesar Archivos
                  </>
                )}
              </button>
            </div>
          </div>
        ) : processing ? (
          // --- Indicador de Carga Simplificado ---
          <div className="flex flex-col items-center py-12">
            <RefreshCw size={40} className="animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Procesando Archivos...</h3>
            <p className="text-sm text-gray-500 mt-1">Esto puede tardar unos momentos.</p>
          </div>
        ) : results ? (
          // --- Vista de Resultados Simplificada ---
          <div className="text-center py-6">
            <div className="bg-green-50 inline-flex rounded-full p-4 mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">¡Procesamiento Completado!</h3>
            <p className="text-gray-600 mb-4">
              {results.message || `Se procesaron ${results.processedFiles} archivo(s).`}
            </p>
            {/* Podríamos añadir más detalles aquí si fuera necesario */}
            {/* <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto mb-6"> ... </div> */}
            <div className="flex justify-center">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg"
                onClick={resetProcess}
              >
                Procesar Más Archivos
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
