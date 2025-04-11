/**
 * Modelo de Expediente para MongoDB
 * 
 * Este esquema ha sido diseñado para almacenar:
 * 1. Todos los campos del Concentrado General (columnas A-AV)
 * 2. Información de pedidos y facturas
 * 3. Estructura optimizada para consultas
 */
import mongoose from 'mongoose';

const expedienteSchema = new mongoose.Schema({
  // Campos clave para identificación
  numeroExpediente: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  cliente: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Datos estructurados para expedientes
  datos: {
    // Fechas principales
    fechaCreacion: Date,
    fechaAsignacion: Date,
    
    // Tipo de servicio
    tipoServicio: String,
    
    // Ubicación
    ubicacion: {
      origen: String,
      destino: String,
      coordenadasOrigen: String,
      coordenadasDestino: String,
      entreCalles: String,
      referencia: String
    },
    
    // Vehículo y operador
    vehiculo: {
      tipo: String,
      placas: String,
      color: String
    },
    operador: String,
    unidadOperativa: String,
    
    // Usuario y cuenta
    usuario: String,
    cuenta: String,
    
    // Costos
    costos: {
      casetaCobro: Number,
      casetaCubierta: String,
      maniobras: Number,
      horaEspera: Number,
      parking: Number,
      otros: Number,
      excedente: Number,
      topeCobertura: Number,
      costoTotal: Number,
      resguardo: Number
    },
    
    // Servicio
    servicio: {
      tipoRecorrido: String,
      distanciaRecorrido: Number,
      tiempoRecorrido: Number,
      tiempoArribo: Number
    },
    
    // Datos de grúa
    grua: {
      placas: String,
      tipo: String,
      ubicacion: String,
      tiempoArribo: String
    },
    
    // Tiempos
    tiempos: {
      ta: String,  // Tiempo Arribo
      tc: String,  // Tiempo Contacto
      tt: String,  // Tiempo Término
      tiempoArriboDin: String
    },
    
    // Servicios especiales
    serviciosEspeciales: {
      plano: String,
      banderazo: String,
      costoKm: Number,
      distanciaRecorridoED: Number,
      servicioMuertoED: String,
      servicioMuertoBD: String,
      servicioMuertoBO: String,
      maniobrasAutorizadas: String
    }
  },
  
  // Órdenes de compra (pedidos)
  pedidos: [{
    numeroPedido: {
      type: String,
      trim: true
    },
    numeroLinea: Number,
    fechaPedido: Date,
    precio: Number,
    estatus: {
      type: String,
      enum: ['NO FACTURADO', 'FACTURADO', 'FACTURADO POR EXPEDIENTE'],
      default: 'NO FACTURADO'
    },
    factura: String,
    descripcion: String,
    cantidad: String,
    subtotal: Number,
    impuesto: Number
  }],
  
  // Facturas
  facturas: [{
    numeroFactura: {
      type: String,
      trim: true
    },
    fechaFactura: Date,
    monto: Number,
    estatus: String
  }],
  
  // Metadatos del sistema
  metadatos: {
    ultimaActualizacion: {
      type: Date,
      default: Date.now
    },
    fuenteDatos: String,
    version: String,
    estadoGeneral: {
      type: String,
      enum: ['PENDIENTE', 'COMPLETO', 'PARCIAL'],
      default: 'PENDIENTE'
    },
    facturado: {
      type: Boolean,
      default: false
    },
    esDuplicado: {
      type: Boolean,
      default: false
    },
    esUnico: {
      type: Boolean,
      default: true
    },
    razonDuplicado: String,
    procesadoPorConcentrador: {
      type: Boolean,
      default: false
    },
    ultimaActualizacionConcentrador: Date,
    importadoDesdeConcentrado: {
      type: Boolean,
      default: false
    }
  },
  
  // *** IMPORTANTE: Contenedor para preservar TODOS los valores originales ***
  // Aquí se guardan todos los campos originales del Excel A-AV
  datosConcentrado: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: true,  // Añadir createdAt y updatedAt
  strict: false      // Permitir campos adicionales no definidos en el esquema
});

// Índice compuesto para expediente y cliente (para evitar duplicados exactos)
expedienteSchema.index({ numeroExpediente: 1, cliente: 1 }, { unique: true });
expedienteSchema.index({ numeroExpediente: 1 });

// Otros índices para optimizar consultas
expedienteSchema.index({ 'pedidos.numeroPedido': 1 });
expedienteSchema.index({ 'facturas.numeroFactura': 1 });
expedienteSchema.index({ 'metadatos.ultimaActualizacion': -1 });
expedienteSchema.index({ 'metadatos.esDuplicado': 1 });
expedienteSchema.index({ 'metadatos.esUnico': 1 });
expedienteSchema.index({ 'datos.tipoServicio': 1 });

// Método para verificar integridad del expediente
expedienteSchema.methods.verificarIntegridad = function() {
  // 1. Verificar campos del concentrado
  const camposObligatoriosConcentrado = [
    'numero', 'cliente', 'fechaRegistro'
  ];
  
  const camposFaltantesConcentrado = camposObligatoriosConcentrado.filter(
    campo => !this.datosConcentrado || this.datosConcentrado[campo] === undefined
  );
  
  // 2. Verificar consistencia con pedidos/facturas
  const tienePedidos = this.pedidos && this.pedidos.length > 0;
  const tieneFacturas = this.facturas && this.facturas.length > 0;
  const tieneConcentrado = this.datosConcentrado && Object.keys(this.datosConcentrado).length > 0;
  
  // 3. Verificar el estado de facturación
  const esFacturado = 
    (tieneFacturas) || 
    (tienePedidos && this.pedidos.some(p => p.estatus === 'FACTURADO' || p.estatus === 'FACTURADO POR EXPEDIENTE'));
  
  // Devolver resultado de verificación
  return {
    integridadCompleta: camposFaltantesConcentrado.length === 0,
    camposFaltantesConcentrado,
    tienePedidos,
    tieneFacturas,
    tieneConcentrado,
    esFacturado
  };
};

// Pre-middleware para asegurar la consistencia de los datos
expedienteSchema.pre('save', function(next) {
  // 1. Asegurar que numeroExpediente y cliente son consistentes con datosConcentrado
  if (this.datosConcentrado && this.datosConcentrado.numero) {
    // Normalizar número de expediente
    const numeroNormalizado = String(this.datosConcentrado.numero)
      .replace(/[^0-9]/g, '')
      .padStart(8, '0');
    
    this.numeroExpediente = numeroNormalizado;
  }
  
  if (this.datosConcentrado && this.datosConcentrado.cliente) {
    // Normalizar cliente
    this.cliente = String(this.datosConcentrado.cliente)
      .replace(/\s+/g, '')
      .toUpperCase();
  }
  
  // 2. Actualizar el estado de facturación
  if (this.facturas && this.facturas.length > 0) {
    this.metadatos = this.metadatos || {};
    this.metadatos.facturado = true;
    this.metadatos.estadoGeneral = 'COMPLETO';
  } else if (this.pedidos && this.pedidos.some(p => p.estatus === 'FACTURADO' || p.estatus === 'FACTURADO POR EXPEDIENTE')) {
    this.metadatos = this.metadatos || {};
    this.metadatos.facturado = true;
    this.metadatos.estadoGeneral = 'COMPLETO';
  }
  
  // 3. Actualizar timestamp de última actualización
  this.metadatos = this.metadatos || {};
  this.metadatos.ultimaActualizacion = new Date();
  
  next();
});

// Static method to find by IKE's 'número de pieza' (for integration)
expedienteSchema.statics.findByNumeroPieza = async function(numeroPieza) {
  // La relación es: número de pieza en IKE = número de expediente en concentrado
  const numeroExpediente = String(numeroPieza)
    .replace(/[^0-9]/g, '')
    .padStart(8, '0');
  
  return this.findOne({ numeroExpediente });
};

const Expediente = mongoose.model('Expediente', expedienteSchema);

export default Expediente;