/**
 * Script para cargar datos de prueba en MongoDB
 * 
 * Este script:
 * 1. Crea datos de ejemplo para expedientes y clientes
 * 2. Inserta los datos en MongoDB
 * 3. Verifica la carga correcta para validar funcionamiento
 * 
 * Ejecutar con: node scripts/load_test_data.js
 * Para forzar limpieza de datos existentes: node scripts/load_test_data.js --force
 */

import * as dotenv from 'dotenv';
dotenv.config();
import { connectToDatabase, mongoose } from '../core/db/connection.js';
import Expediente from '../core/db/models/expediente.js';
import { Cliente } from '../core/db/models/cliente.js';
import { Log } from '../core/db/models/log.js';
import { normalizeExpediente, normalizePedido } from '../core/concentrador/utils/normalizers.js';

// Datos de ejemplo para clientes
const CLIENTES_EJEMPLO = [
  {
    codigo: 'IKE',
    nombre: 'Cliente IKE',
    configuracion: {
      columnasMostradas: ['numeroExpediente', 'fechaCreacion', 'estatus'],
      rutasProcesamiento: {
        ordenes: 'PDF-PEDIDOS/',
        facturas: 'PDF-FACTURAS/'
      }
    },
    activo: true
  },
  {
    codigo: 'DEMO',
    nombre: 'Cliente Demostración',
    configuracion: {
      columnasMostradas: ['numeroExpediente', 'tipoServicio', 'estatus'],
      rutasProcesamiento: {
        ordenes: 'DEMO-PEDIDOS/',
        facturas: 'DEMO-FACTURAS/'
      }
    },
    activo: true
  }
];

// Función para generar datos de expedientes
function generarExpedientesEjemplo(cantidad = 20, offset = 1) {
  const expedientes = [];
  const tiposServicio = ['ARRASTRE', 'GRUA', 'SALVAMENTO', 'TRASLADO'];
  const estados = ['NO FACTURADO', 'FACTURADO', 'FACTURADO POR EXPEDIENTE'];
  
  // Usar un offset para evitar colisiones en números de expediente
  for (let i = offset; i < offset + cantidad; i++) {
    // Alternar cliente entre IKE y DEMO
    const cliente = i % 2 === 0 ? 'IKE' : 'DEMO';
    
    // Generar número de expediente (8 dígitos)
    const numeroBase = 20000000 + i; // Cambiar base para evitar colisiones
    const numeroExpediente = normalizeExpediente(numeroBase.toString());
    
    // Determinar si está facturado (60% de probabilidad)
    const facturado = Math.random() > 0.4;
    
    // Fecha de creación aleatoria en los últimos 90 días
    const fechaCreacion = new Date();
    fechaCreacion.setDate(fechaCreacion.getDate() - Math.floor(Math.random() * 90));
    
    // Datos del expediente
    const expediente = {
      numeroExpediente,
      cliente,
      datos: {
        fechaCreacion,
        tipoServicio: tiposServicio[Math.floor(Math.random() * tiposServicio.length)]
      },
      pedidos: [],
      facturas: [],
      metadatos: {
        ultimaActualizacion: new Date(),
        fuenteDatos: 'script_carga_test',
        version: '1.0.0',
        estadoGeneral: facturado ? 'COMPLETO' : 'PENDIENTE',
        facturado,
        esDuplicado: false,
        esUnico: true,
        procesadoPorConcentrador: true
      }
    };
    
    // Generar entre 1 y 3 pedidos
    const numPedidos = Math.floor(Math.random() * 3) + 1;
    for (let j = 1; j <= numPedidos; j++) {
      // Generar número de pedido (10 dígitos)
      const numeroPedidoBase = 2000000000 + (i * 10) + j; // Cambiar base para evitar colisiones
      const numeroPedido = normalizePedido(numeroPedidoBase.toString());
      
      // Fecha del pedido
      const fechaPedido = new Date(fechaCreacion);
      fechaPedido.setDate(fechaPedido.getDate() + Math.floor(Math.random() * 5));
      
      // Precio aleatorio entre $500 y $3000
      const precio = Math.round((500 + Math.random() * 2500) * 100) / 100;
      
      // Estado del pedido (si expediente está facturado, al menos un pedido debe estarlo)
      const estadoPedido = facturado && j === 1 ? estados[1] : estados[Math.floor(Math.random() * estados.length)];
      
      // Número de factura si está facturado
      const factura = estadoPedido === 'FACTURADO' ? `F${i}${j}` : '';
      
      expediente.pedidos.push({
        numeroPedido,
        numeroLinea: j,
        fechaPedido,
        precio,
        estatus: estadoPedido,
        factura
      });
    }
    
    // Si está facturado, generar una factura
    if (facturado) {
      const fechaFactura = new Date(fechaCreacion);
      fechaFactura.setDate(fechaFactura.getDate() + Math.floor(Math.random() * 15) + 5);
      
      const montoFactura = expediente.pedidos.reduce((sum, pedido) => {
        return pedido.estatus === 'FACTURADO' ? sum + pedido.precio : sum;
      }, 0);
      
      expediente.facturas.push({
        numeroFactura: `F${i}1`,
        fechaFactura,
        monto: montoFactura
      });
    }
    
    expedientes.push(expediente);
  }
  
  // Generar algunos duplicados (10% de los expedientes)
  const duplicadosCount = Math.ceil(cantidad * 0.1);
  for (let i = 0; i < duplicadosCount; i++) {
    // Seleccionar un expediente al azar para duplicar
    const indiceOriginal = Math.floor(Math.random() * expedientes.length);
    const original = expedientes[indiceOriginal];
    
    // Crear una copia con datos ligeramente diferentes pero mantener el cliente diferente
    // para evitar colisión con el índice único {numeroExpediente, cliente}
    const duplicado = JSON.parse(JSON.stringify(original));
    duplicado.cliente = duplicado.cliente === 'IKE' ? 'DEMO' : 'IKE'; // Alternar cliente para evitar duplicados exactos
    duplicado.metadatos.ultimaActualizacion = new Date(original.metadatos.ultimaActualizacion);
    duplicado.metadatos.ultimaActualizacion.setDate(duplicado.metadatos.ultimaActualizacion.getDate() - 10);
    duplicado.metadatos.esDuplicado = true;
    duplicado.metadatos.esUnico = false;
    duplicado.metadatos.razonDuplicado = 'VERSIÓN_ANTERIOR';
    
    // Modificar algunos datos para simular versión anterior
    if (duplicado.pedidos.length > 0) {
      // Eliminar el último pedido
      duplicado.pedidos.pop();
    }
    
    // Eliminar facturas (versión anterior no estaba facturada)
    duplicado.facturas = [];
    duplicado.metadatos.facturado = false;
    duplicado.metadatos.estadoGeneral = 'PENDIENTE';
    
    expedientes.push(duplicado);
  }
  
  return expedientes;
}

// Función para insertar datos de manera segura
async function insertarExpedientesSeguros(expedientes) {
  const resultados = {
    insertados: 0,
    errores: 0,
    detalles: []
  };
  
  // Usar un enfoque más seguro: insertar uno por uno con manejo de errores
  for (const expediente of expedientes) {
    try {
      // Verificar si ya existe un expediente con el mismo número y cliente
      const existe = await Expediente.findOne({
        numeroExpediente: expediente.numeroExpediente,
        cliente: expediente.cliente
      });
      
      if (existe) {
        // Si ya existe, saltarlo y registrar
        resultados.detalles.push({
          numeroExpediente: expediente.numeroExpediente,
          cliente: expediente.cliente,
          resultado: 'OMITIDO_EXISTENTE'
        });
        continue;
      }
      
      // Insertar el expediente
      await Expediente.create(expediente);
      resultados.insertados++;
      resultados.detalles.push({
        numeroExpediente: expediente.numeroExpediente,
        cliente: expediente.cliente,
        resultado: 'INSERTADO'
      });
    } catch (error) {
      resultados.errores++;
      resultados.detalles.push({
        numeroExpediente: expediente.numeroExpediente,
        cliente: expediente.cliente,
        resultado: 'ERROR',
        error: error.message
      });
    }
  }
  
  return resultados;
}

// Función principal
async function cargarDatosPrueba() {
  console.log('=== CARGA DE DATOS DE PRUEBA ===');
  
  try {
    // Conectar a MongoDB
    await connectToDatabase();
    console.log('✅ Conexión a MongoDB establecida');
    
    // Verificar si ya existen datos
    const expedientesExistentes = await Expediente.countDocuments();
    const clientesExistentes = await Cliente.countDocuments();
    
    if (expedientesExistentes > 0 || clientesExistentes > 0) {
      console.log('⚠️ Ya existen datos en la base de datos:');
      console.log(`   - Expedientes: ${expedientesExistentes}`);
      console.log(`   - Clientes: ${clientesExistentes}`);
      
      const continuar = process.argv.includes('--force');
      
      if (!continuar) {
        console.log('\n❌ Operación cancelada. Para forzar la carga de datos, use --force');
        await mongoose.connection.close();
        console.log('MongoDB: Conexión cerrada');
        return;
      }
      
      console.log('\n⚠️ Forzando carga de datos (--force)');
      
      // Eliminar datos existentes
      await Expediente.deleteMany({});
      await Cliente.deleteMany({});
      await Log.deleteMany({});
      console.log('✅ Datos existentes eliminados');
    }
    
    // Cargar clientes
    console.log('\nCargando clientes...');
    await Cliente.insertMany(CLIENTES_EJEMPLO);
    console.log(`✅ ${CLIENTES_EJEMPLO.length} clientes insertados`);
    
    // Generar y cargar expedientes
    console.log('\nGenerando expedientes de ejemplo...');
    const CANTIDAD_EXPEDIENTES = 50;
    const expedientesEjemplo = generarExpedientesEjemplo(CANTIDAD_EXPEDIENTES);
    console.log(`✅ ${expedientesEjemplo.length} expedientes generados`);
    
    console.log('Insertando expedientes en MongoDB...');
    const resultadosInsercion = await insertarExpedientesSeguros(expedientesEjemplo);
    console.log(`✅ ${resultadosInsercion.insertados} expedientes insertados exitosamente`);
    
    if (resultadosInsercion.errores > 0) {
      console.log(`⚠️ ${resultadosInsercion.errores} errores durante la inserción`);
    }
    
    // Verificar datos cargados
    const totalExpedientes = await Expediente.countDocuments();
    const totalClientes = await Cliente.countDocuments();
    
    console.log('\n=== RESUMEN DE CARGA ===');
    console.log(`Total clientes cargados: ${totalClientes}`);
    console.log(`Total expedientes cargados: ${totalExpedientes}`);
    console.log(`Expedientes IKE: ${await Expediente.countDocuments({ cliente: 'IKE' })}`);
    console.log(`Expedientes DEMO: ${await Expediente.countDocuments({ cliente: 'DEMO' })}`);
    console.log(`Expedientes únicos: ${await Expediente.countDocuments({ 'metadatos.esUnico': true })}`);
    console.log(`Expedientes duplicados: ${await Expediente.countDocuments({ 'metadatos.esDuplicado': true })}`);
    
    // Registrar en log
    await Log.create({
      timestamp: new Date(),
      operacion: 'carga_datos_prueba',
      cliente: 'SISTEMA',
      detalles: {
        clientesCargados: totalClientes,
        expedientesCargados: totalExpedientes,
        script: 'load_test_data.js'
      }
    });
    
    console.log('\n✅ Proceso completado exitosamente');
    
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log('MongoDB: Conexión cerrada');
    
  } catch (error) {
    console.error('\n❌ Error durante la carga de datos:');
    console.error(error);
    
    // Intentar cerrar conexión a MongoDB
    try {
      await mongoose.connection.close();
      console.log('MongoDB: Conexión cerrada');
    } catch (err) {}
    
    process.exit(1);
  }
}

// Ejecutar función principal
cargarDatosPrueba();