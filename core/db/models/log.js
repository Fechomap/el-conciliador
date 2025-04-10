/**
 * Modelo de Log para MongoDB
 */
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  operacion: {
    type: String,
    required: true,
    trim: true
  },
  cliente: {
    type: String,
    required: true,
    trim: true
  },
  detalles: {
    archivosAnalizados: Number,
    registrosCreados: Number,
    registrosActualizados: Number,
    errores: [String]
  },
  nivel: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR'],
    default: 'INFO'
  }
}, { timestamps: true });

// Indexar por timestamp para consultas rápidas
logSchema.index({ timestamp: -1 });
logSchema.index({ cliente: 1, timestamp: -1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
