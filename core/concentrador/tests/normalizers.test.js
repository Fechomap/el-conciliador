/**
 * Pruebas para funciones de normalización
 */
import { describe, it, expect } from 'jest';
import * as normalizers from '../utils/normalizers.js';

describe('Funciones de normalización', () => {
  
  describe('normalizeText', () => {
    it('debería normalizar texto con espacios múltiples', () => {
      expect(normalizers.normalizeText("  texto  con   espacios  ")).toBe("Texto Con Espacios");
    });
    
    it('debería capitalizar correctamente', () => {
      expect(normalizers.normalizeText("texto en minúsculas")).toBe("Texto En Minúsculas");
    });
    
    it('debería manejar valores nulos o undefined', () => {
      expect(normalizers.normalizeText(null)).toBeNull();
      expect(normalizers.normalizeText(undefined)).toBeUndefined();
    });
  });
  
  describe('normalizeExpediente', () => {
    it('debería normalizar expedientes numéricos', () => {
      expect(normalizers.normalizeExpediente(12345)).toBe("00012345");
    });
    
    it('debería eliminar caracteres no numéricos', () => {
      expect(normalizers.normalizeExpediente("EXP-12345")).toBe("00012345");
    });
    
    it('debería mantener 8 dígitos con ceros a la izquierda', () => {
      expect(normalizers.normalizeExpediente("123")).toBe("00000123");
      expect(normalizers.normalizeExpediente(12345678)).toBe("12345678");
    });
  });
  
  describe('normalizePedido', () => {
    it('debería normalizar pedidos numéricos', () => {
      expect(normalizers.normalizePedido(1234567890)).toBe("1234567890");
    });
    
    it('debería eliminar caracteres no numéricos', () => {
      expect(normalizers.normalizePedido("PED-1234567890")).toBe("1234567890");
    });
    
    it('debería mantener 10 dígitos con ceros a la izquierda', () => {
      expect(normalizers.normalizePedido("123")).toBe("0000000123");
      expect(normalizers.normalizePedido(1234567890)).toBe("1234567890");
    });
  });
  
  describe('normalizeCliente', () => {
    it('debería normalizar y convertir a mayúsculas', () => {
      expect(normalizers.normalizeCliente("ike")).toBe("IKE");
    });
    
    it('debería eliminar espacios', () => {
      expect(normalizers.normalizeCliente(" ike asegurado ")).toBe("IKEASEGURADO");
    });
  });
  
  describe('normalizeMonto', () => {
    it('debería convertir strings a números', () => {
      expect(normalizers.normalizeMonto("123.45")).toBe(123.45);
    });
    
    it('debería manejar formato con comas', () => {
      expect(normalizers.normalizeMonto("1,234.56")).toBe(1234.56);
    });
    
    it('debería eliminar símbolos monetarios', () => {
      expect(normalizers.normalizeMonto("$123.45")).toBe(123.45);
    });
    
    it('debería redondear a 2 decimales', () => {
      expect(normalizers.normalizeMonto(123.456789)).toBe(123.46);
    });
  });
});