// Lógica pura de inventario (testeable sin BD) — RN-02

export type TipoMovimiento = 'entrada' | 'salida_venta' | 'ajuste';

/**
 * Valida un movimiento contra el stock actual.
 * RN-02: no se permite stock negativo; los ajustes negativos deben
 * llevar observación (quedan "autorizados y registrados").
 * Devuelve el mensaje de error, o null si es válido.
 */
export function validarMovimiento(params: {
  tipo: TipoMovimiento;
  cantidad: number;
  stockActual: number;
  observacion?: string;
}): string | null {
  const { tipo, cantidad, stockActual, observacion } = params;

  if (cantidad === 0) return 'La cantidad no puede ser cero';
  if (tipo === 'entrada' && cantidad < 0) return 'Una entrada debe tener cantidad positiva';
  if (tipo === 'salida_venta' && cantidad > 0)
    return 'Una salida por venta debe tener cantidad negativa';

  if (tipo === 'ajuste' && cantidad < 0 && !observacion?.trim()) {
    return 'Un ajuste negativo requiere observación (RN-02)';
  }

  const stockResultante = stockActual + cantidad;
  if (stockResultante < 0) {
    return `Stock insuficiente: disponible ${stockActual}, el movimiento dejaría ${stockResultante}`;
  }

  return null;
}
