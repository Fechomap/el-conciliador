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
    
    try {
      // Crear FormData para enviar archivos
      const formData = new FormData();
      
      // Agregar PDFs de pedidos
      orderPdfs.forEach(file => {
        formData.append('orderPdfs', file);
      });
      
      // Agregar PDFs de facturas
      invoicePdfs.forEach(file => {
        formData.append('invoicePdfs', file);
      });
      
      // Agregar Excel si existe
      if (excelFile) {
        formData.append('excelFile', excelFile);
      }
      
      // Simular respuesta de API (reemplazar con llamada real)
      // En implementación real, esto sería un fetch a su API
      // 1. Preparar archivos
      setCurrentStep("uploading");
      await simulateApiStep(2000);
      
      // 2. Procesar PDFs
      if (orderPdfs.length > 0 || invoicePdfs.length > 0) {
        setCurrentStep("processing_pdfs");
        await simulateApiStep(3000);
      }
      
      // 3. Sincronizar con MongoDB
      setCurrentStep("syncing");
      await simulateApiStep(2000);
      
      // 4. Ejecutar concentrador
      setCurrentStep("concentrator");
      await simulateApiStep(2500);
      
      // Simular resultados exitosos
      setResults({
        processingTime: "00:08:23",
        processedFiles: orderPdfs.length + invoicePdfs.length + (excelFile ? 1 : 0),
        newRecords: Math.floor(Math.random() * 20) + 5,
        updatedRecords: Math.floor(Math.random() * 15) + 3,
        duplicates: Math.floor(Math.random() * 5)
      });
      
    } catch (err) {
      console.error("Error processing files:", err);
      setError("Ha ocurrido un error durante el procesamiento. Por favor inténtelo de nuevo.");
    } finally {
      setProcessing(false);
      setCurrentStep(null);
    }
  };
  
  // Función para simular pasos de API (para demo)
  const simulateApiStep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
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
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg flex items-center"
                onClick={processPdfs}
                disabled={orderPdfs.length === 0 && invoicePdfs.length === 0 && !excelFile}
              >
                <Upload size={18} className="mr-2" />
                Procesar Archivos
              </button>
            </div>
          </div>
        ) : processing ? (
          <div className="flex flex-col items-center py-8">
            <div className="text-center">
              <RefreshCw size={40} className="animate-spin mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Procesando Archivos</h3>
              <p className="text-gray-500 max-w-md">
                Este proceso puede tomar varios minutos dependiendo del número y tamaño de los archivos.
              </p>
              
              <div className="mt-6 w-full max-w-md mx-auto">
                <div className="relative">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                    <div className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 ${
                      currentStep === "preparing" ? "w-1/5" :
                      currentStep === "uploading" ? "w-2/5" :
                      currentStep === "processing_pdfs" ? "w-3/5" :
                      currentStep === "syncing" ? "w-4/5" :
                      currentStep === "concentrator" ? "w-full" : "w-0"
                    }`}></div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mt-2">
                  {currentStep === "preparing" && "Preparando archivos..."}
                  {currentStep === "uploading" && "Subiendo archivos al servidor..."}
                  {currentStep === "processing_pdfs" && "Extrayendo información de los PDFs..."}
                  {currentStep === "syncing" && "Sincronizando con base de datos..."}
                  {currentStep === "concentrator" && "Ejecutando proceso de consolidación..."}
                </div>
              </div>
            </div>
          </div>
        ) : results ? (
          <div className="text-center py-6">
            <div className="bg-green-50 inline-flex rounded-full p-4 mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">¡Procesamiento Completado!</h3>
            <p className="text-gray-500 mb-6">
              Los archivos han sido procesados exitosamente y los datos han sido integrados al sistema.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto mb-6">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-500">Tiempo de procesamiento</p>
                  <p className="font-medium">{results.processingTime}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Archivos procesados</p>
                  <p className="font-medium">{results.processedFiles}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registros nuevos</p>
                  <p className="font-medium">{results.newRecords}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registros actualizados</p>
                  <p className="font-medium">{results.updatedRecords}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duplicados detectados</p>
                  <p className="font-medium">{results.duplicates}</p>
                </div>
              </div>
            </div>
            
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