import { describe, expect, it } from 'vitest';
import { validarMovimiento } from '../src/modules/inventario/inventario.logic';

describe('validarMovimiento (RF-09, RN-02)', () => {
  it('acepta una entrada positiva', () => {
    expect(
      validarMovimiento({ tipo: 'entrada', cantidad: 10, stockActual: 0 }),
    ).toBeNull();
  });

  it('rechaza una entrada negativa', () => {
    expect(
      validarMovimiento({ tipo: 'entrada', cantidad: -5, stockActual: 10 }),
    ).toContain('positiva');
  });

  it('rechaza cantidad cero', () => {
    expect(validarMovimiento({ tipo: 'ajuste', cantidad: 0, stockActual: 10 })).toContain('cero');
  });

  it('acepta ajuste negativo con observación (RN-02)', () => {
    expect(
      validarMovimiento({
        tipo: 'ajuste',
        cantidad: -3,
        stockActual: 10,
        observacion: 'Merma por rotura en bodega',
      }),
    ).toBeNull();
  });

  it('rechaza ajuste negativo sin observación (RN-02)', () => {
    expect(
      validarMovimiento({ tipo: 'ajuste', cantidad: -3, stockActual: 10 }),
    ).toContain('observación');
  });

  it('rechaza movimiento que dejaría stock negativo (RN-02)', () => {
    const error = validarMovimiento({
      tipo: 'ajuste',
      cantidad: -15,
      stockActual: 10,
      observacion: 'Ajuste inventario',
    });
    expect(error).toContain('Stock insuficiente');
  });

  it('rechaza salida por venta con cantidad positiva', () => {
    expect(
      validarMovimiento({ tipo: 'salida_venta', cantidad: 5, stockActual: 10 }),
    ).toContain('negativa');
  });

  it('acepta salida por venta válida', () => {
    expect(
      validarMovimiento({ tipo: 'salida_venta', cantidad: -5, stockActual: 10 }),
    ).toBeNull();
  });
});
