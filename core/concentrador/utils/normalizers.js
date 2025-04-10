/**
 * Funciones utilitarias para normalización de datos
 */

/**
 * Normaliza texto (elimina espacios extras, capitaliza, etc.)
 * @param {String} text - Texto a normalizar
 * @returns {String} - Texto normalizado
 */
export function normalizeText(text) {
  if (!text) return text;
  
  // Eliminar espacios múltiples y trim
  let normalized = text.replace(/\s+/g, ' ').trim();
  
  // Capitalizar primera letra de cada palabra
  normalized = normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
    
  return normalized;
}

/**
 * Normaliza un número de expediente
 * @param {String|Number} expediente - Número de expediente
 * @returns {String} - Número normalizado
 */
export function normalizeExpediente(expediente) {
  if (!expediente) return '';
  
  // Convertir a string y eliminar caracteres no numéricos
  const expStr = String(expediente).replace(/[^0-9]/g, '');
  
  // Asegurar 8 dígitos con ceros a la izquierda si es necesario
  return expStr.padStart(8, '0');
}

/**
 * Normaliza un número de pedido
 * @param {String|Number} pedido - Número de pedido
 * @returns {String} - Número normalizado
 */
export function normalizePedido(pedido) {
  if (!pedido) return '';
  
  // Convertir a string y eliminar caracteres no numéricos
  const pedidoStr = String(pedido).replace(/[^0-9]/g, '');
  
  // Asegurar 10 dígitos con ceros a la izquierda si es necesario
  return pedidoStr.padStart(10, '0');
}

/**
 * Normaliza un código de cliente
 * @param {String} cliente - Código de cliente
 * @returns {String} - Código normalizado
 */
export function normalizeCliente(cliente) {
  if (!cliente) return '';
  
  // Eliminar espacios y convertir a mayúsculas
  return String(cliente).replace(/\s+/g, '').toUpperCase();
}

/**
 * Normaliza un valor monetario
 * @param {String|Number} monto - Valor monetario
 * @returns {Number} - Valor normalizado como número
 */
export function normalizeMonto(monto) {
  if (monto === null || monto === undefined) return 0;
  
  // Si ya es número, redondear a 2 decimales
  if (typeof monto === 'number') {
    return Math.round(monto * 100) / 100;
  }
  
  // Convertir string a número
  const montoStr = String(monto)
    .replace(/[^\d.,]/g, '') // Eliminar caracteres que no sean dígitos, punto o coma
    .replace(',', '.'); // Cambiar comas por puntos
    
  // Convertir a número y redondear
  return Math.round(parseFloat(montoStr) * 100) / 100;
}