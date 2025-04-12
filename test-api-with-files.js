import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testProcessingRouteWithFiles() {
  try {
    const formData = new FormData();
    
    // Agregar un archivo PDF de pedido
    const pedidoPath = path.join(process.cwd(), 'modules/ike-processor/PDF-PEDIDOS/5100873593.pdf');
    if (fs.existsSync(pedidoPath)) {
      const pedidoFile = fs.readFileSync(pedidoPath);
      formData.append('pedidosPdfs', pedidoFile, '5100873593.pdf');
      console.log('Agregado archivo de pedido:', pedidoPath);
    } else {
      console.log('No se encontró el archivo de pedido:', pedidoPath);
    }
    
    // Agregar un archivo PDF de factura
    const facturaPath = path.join(process.cwd(), 'modules/ike-processor/PDF-FACTURAS/A846.pdf');
    if (fs.existsSync(facturaPath)) {
      const facturaFile = fs.readFileSync(facturaPath);
      formData.append('facturasPdfs', facturaFile, 'A846.pdf');
      console.log('Agregado archivo de factura:', facturaPath);
    } else {
      console.log('No se encontró el archivo de factura:', facturaPath);
    }
    
    // Enviar la solicitud
    console.log('Enviando solicitud a http://localhost:3000/api/procesar-archivos...');
    
    const response = await fetch('http://localhost:3000/api/procesar-archivos', {
      method: 'POST',
      body: formData
    });
    
    console.log('Código de estado:', response.status);
    console.log('Texto de estado:', response.statusText);
    console.log('Headers:', JSON.stringify([...response.headers.entries()]));
    
    const text = await response.text();
    console.log('Respuesta como texto:', text);
    
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const data = JSON.parse(text);
        console.log('Respuesta como JSON:', data);
      } catch (e) {
        console.log('No se pudo parsear la respuesta como JSON:', e.message);
      }
    }
  } catch (error) {
    console.error('Error al realizar la solicitud:', error);
  }
}

testProcessingRouteWithFiles();
