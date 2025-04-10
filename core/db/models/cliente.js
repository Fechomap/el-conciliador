/**
 * Modelo de Cliente para MongoDB
 */
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  configuracion: {
    columnasMostradas: [String],
    rutasProcesamiento: {
      ordenes: String,
      facturas: String
    }
  },
  activo: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;
