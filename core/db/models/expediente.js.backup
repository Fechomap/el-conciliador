/**
 * Modelo de Expediente para MongoDB
 */
import mongoose from 'mongoose';

const expedienteSchema = new mongoose.Schema({
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
  datos: {
    fechaCreacion: Date,
    tipoServicio: String,
    // Otros campos específicos del expediente
  },
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
    factura: String
  }],
  facturas: [{
    numeroFactura: {
      type: String,
      trim: true
    },
    fechaFactura: Date,
    monto: Number
  }],
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
    ultimaActualizacionConcentrador: Date
  }
}, { timestamps: true });

// Índice compuesto para numeroExpediente y cliente (para evitar duplicados exactos)
expedienteSchema.index({ numeroExpediente: 1, cliente: 1 }, { unique: true });

// Otros índices para optimizar consultas
expedienteSchema.index({ 'pedidos.numeroPedido': 1 });
expedienteSchema.index({ 'facturas.numeroFactura': 1 });
expedienteSchema.index({ 'metadatos.ultimaActualizacion': -1 });
expedienteSchema.index({ 'metadatos.esDuplicado': 1 });
expedienteSchema.index({ 'metadatos.esUnico': 1 });

const Expediente = mongoose.model('Expediente', expedienteSchema);

// Exportar como default export
export default Expediente;