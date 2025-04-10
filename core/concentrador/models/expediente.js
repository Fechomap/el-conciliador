/**
 * Modelo de Expediente para MongoDB
 */
import mongoose from 'mongoose';

const expedienteSchema = new mongoose.Schema({
  numeroExpediente: {
    type: String,
    required: true,
    unique: true,
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
    version: String
  }
}, { timestamps: true });

// Indexar para búsquedas rápidas por expediente
expedienteSchema.index({ numeroExpediente: 1 });
expedienteSchema.index({ cliente: 1, numeroExpediente: 1 });

const Expediente = mongoose.model('Expediente', expedienteSchema);

export default Expediente;