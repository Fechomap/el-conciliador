/**
 * Servicio de normalización de datos desde MongoDB
 */
import mongoose from 'mongoose';
import Expediente from '../../db/models/expediente.js';

/**
 * Normaliza los registros desde MongoDB
 * @param {String} cliente - Código del cliente
 * @returns {Promise<Array>} - Registros normalizados
 */
export async function normalizeRecords(cliente) {
  try {
    console.log(`Normalizando registros para cliente: ${cliente}`);
    
    // Consulta agregada para obtener expedientes con información completa
    const expedientes = await Expediente.aggregate([
      // Filtrar por cliente
      { $match: { cliente } },
      
      // Ordenar por última actualización (más reciente primero)
      { $sort: { "metadatos.ultimaActualizacion": -1 } },
      
      // Proyecto para transformar datos
      { $project: {
        numeroExpediente: 1,
        cliente: 1,
        datos: 1,
        pedidos: 1,
        facturas: 1,
        metadatos: 1,
        
        // Campos calculados para facilitar procesamiento
        facturado: {
          $cond: {
            if: { $gt: [{ $size: "$facturas" }, 0] },
            then: true,
            else: false
          }
        },
        
        // Calcular el número total de pedidos
        totalPedidos: { $size: "$pedidos" },
        
        // Fecha más reciente (de pedido o factura)
        fechaMasReciente: {
          $max: [
            "$metadatos.ultimaActualizacion",
            { $max: "$pedidos.fechaPedido" },
            { $max: "$facturas.fechaFactura" }
          ]
        }
      }}
    ]);
    
    console.log(`Encontrados ${expedientes.length} expedientes para normalizar`);
    
    // Aplicar transformaciones adicionales
    const normalizedRecords = expedientes.map(expediente => {
      // Obtener el total facturado sumando montos de facturas
      const totalFacturado = (expediente.facturas || []).reduce(
        (sum, factura) => sum + (factura.monto || 0), 
        0
      );
      
      // Obtener el total de pedidos sumando precios
      const totalPedidos = (expediente.pedidos || []).reduce(
        (sum, pedido) => sum + (pedido.precio || 0),
        0
      );
      
      // Determinar el estado general
      let estadoGeneral = 'PENDIENTE';
      if (expediente.facturado) {
        if (totalFacturado >= totalPedidos) {
          estadoGeneral = 'COMPLETO';
        } else {
          estadoGeneral = 'PARCIAL';
        }
      }
      
      // Construir registro normalizado
      return {
        id: expediente._id,
        numeroExpediente: expediente.numeroExpediente,
        cliente: expediente.cliente,
        
        // Datos principales
        fechaCreacion: expediente.datos?.fechaCreacion,
        tipoServicio: expediente.datos?.tipoServicio,
        
        // Información de pedidos y facturas
        pedidos: expediente.pedidos || [],
        facturas: expediente.facturas || [],
        
        // Metadatos y campos calculados
        facturado: expediente.facturado,
        estadoGeneral,
        totalPedidos: expediente.totalPedidos,
        totalFacturado,
        fechaMasReciente: expediente.fechaMasReciente,
        ultimaActualizacion: expediente.metadatos?.ultimaActualizacion
      };
    });
    
    return normalizedRecords;
  } catch (error) {
    console.error('Error al normalizar registros:', error);
    throw error;
  }
}

/**
 * Normaliza un campo específico en todos los registros
 * @param {String} fieldName - Nombre del campo a normalizar
 * @param {Function} normalizationFn - Función de normalización
 * @param {String} cliente - Código del cliente (opcional)
 * @returns {Promise<Object>} - Resultado de la normalización
 */
export async function normalizeField(fieldName, normalizationFn, cliente = null) {
  try {
    // Construir filtro base
    const filter = cliente ? { cliente } : {};
    
    // Obtener todos los valores únicos del campo
    const distinctValues = await Expediente.distinct(fieldName, filter);
    console.log(`Encontrados ${distinctValues.length} valores distintos para campo '${fieldName}'`);
    
    // Aplicar normalización
    const normalizations = {};
    let totalUpdated = 0;
    
    for (const value of distinctValues) {
      if (!value) continue; // Ignorar valores nulos o vacíos
      
      // Obtener valor normalizado
      const normalizedValue = normalizationFn(value);
      if (value !== normalizedValue) {
        normalizations[value] = normalizedValue;
        
        // Actualizar documentos con este valor
        const updateFilter = { [fieldName]: value };
        if (cliente) updateFilter.cliente = cliente;
        
        const result = await Expediente.updateMany(
          updateFilter,
          { $set: { [fieldName]: normalizedValue } }
        );
        
        totalUpdated += result.modifiedCount;
      }
    }
    
    return {
      field: fieldName,
      distinctValues: distinctValues.length,
      normalizedValues: Object.keys(normalizations).length,
      totalUpdated,
      normalizations
    };
  } catch (error) {
    console.error(`Error al normalizar campo '${fieldName}':`, error);
    throw error;
  }
}

/**
 * Normaliza nombres de servicio/tipos para consistencia
 * @param {String} cliente - Código del cliente
 * @returns {Promise<Object>} - Resultado de la normalización
 */
export async function normalizeTipoServicio(cliente) {
  // Función para normalizar tipo de servicio
  const normalizeTipo = (tipo) => {
    if (!tipo) return tipo;
    
    // Convertir a minúsculas para normalización
    const tipoLower = tipo.toLowerCase();
    
    // Mapeo de tipos comunes
    if (tipoLower.includes('arrastre')) return 'ARRASTRE';
    if (tipoLower.includes('traslado')) return 'TRASLADO';
    if (tipoLower.includes('grua')) return 'GRUA';
    if (tipoLower.includes('salvamento')) return 'SALVAMENTO';
    
    // Si no coincide con ninguno, dejar original pero capitalizado
    return tipo.toUpperCase();
  };
  
  return normalizeField('datos.tipoServicio', normalizeTipo, cliente);
}

export default {
  normalizeRecords,
  normalizeField,
  normalizeTipoServicio
};
