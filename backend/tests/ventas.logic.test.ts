import { describe, expect, it } from 'vitest';
import { calcularTotales, validarStockVenta, type ItemVenta } from '../src/modules/ventas/ventas.logic';

describe('calcularTotales (RF-13)', () => {
  it('calcula subtotales y total de una venta multilinea', () => {
    const items: ItemVenta[] = [
      { productoId: 1, cantidad: 2, precioUnitario: 12990 },
      { productoId: 2, cantidad: 1.5, precioUnitario: 8000 },
    ];
    const { detalles, total } = calcularTotales(items);
    expect(detalles[0]?.subtotal).toBe(25980);
    expect(detalles[1]?.subtotal).toBe(12000);
    expect(total).toBe(37980);
  });

  it('redondea a 2 decimales cantidades fraccionarias', () => {
    const { total } = calcularTotales([{ productoId: 1, cantidad: 0.33, precioUnitario: 999 }]);
    expect(total).toBe(329.67);
  });

  it('venta vacía tiene total 0', () => {
    expect(calcularTotales([]).total).toBe(0);
  });
});

describe('validarStockVenta (RN-01, RN-02)', () => {
  const nombres = new Map([
    [1, 'Cerámica 60x60'],
    [2, 'Adhesivo 25kg'],
  ]);

  it('acepta venta con stock suficiente', () => {
    const stocks = new Map([
      [1, 10],
      [2, 5],
    ]);
    const errores = validarStockVenta(
      [
        { productoId: 1, cantidad: 3, precioUnitario: 100 },
        { productoId: 2, cantidad: 5, precioUnitario: 100 },
      ],
      stocks,
      nombres,
    );
    expect(errores).toEqual([]);
  });

  it('rechaza venta que dejaría stock negativo (RN-02)', () => {
    const stocks = new Map([[1, 2]]);
    const errores = validarStockVenta(
      [{ productoId: 1, cantidad: 3, precioUnitario: 100 }],
      stocks,
      nombres,
    );
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain('Stock insuficiente');
    expect(errores[0]).toContain('Cerámica 60x60');
  });

  it('acumula cantidades del mismo producto en varias líneas', () => {
    const stocks = new Map([[1, 5]]);
    const errores = validarStockVenta(
      [
        { productoId: 1, cantidad: 3, precioUnitario: 100 },
        { productoId: 1, cantidad: 3, precioUnitario: 90 },
      ],
      stocks,
      nombres,
    );
    expect(errores).toHaveLength(1); // 6 > 5 aunque cada línea cabe por sí sola
  });

  it('producto sin movimientos se trata como stock 0', () => {
    const errores = validarStockVenta(
      [{ productoId: 2, cantidad: 1, precioUnitario: 100 }],
      new Map(),
      nombres,
    );
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain('disponible 0');
  });

  it('rechaza cantidades no positivas', () => {
    const stocks = new Map([[1, 10]]);
    const errores = validarStockVenta(
      [{ productoId: 1, cantidad: 0, precioUnitario: 100 }],
      stocks,
      nombres,
    );
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain('Cantidad inválida');
  });
});
