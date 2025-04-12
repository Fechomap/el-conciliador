import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testProcessingRoute() {
  try {
    const formData = new FormData();
    
    // Intentar enviar una solicitud simple sin archivos
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

testProcessingRoute();
