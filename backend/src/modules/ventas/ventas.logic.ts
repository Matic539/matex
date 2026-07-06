// Lógica pura de ventas (testeable sin BD) — RN-01, RN-02

export interface ItemVenta {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Subtotal de una línea y total de la venta */
export function calcularTotales(items: ItemVenta[]): {
  detalles: (ItemVenta & { subtotal: number })[];
  total: number;
} {
  const detalles = items.map((i) => ({
    ...i,
    subtotal: round2(i.cantidad * i.precioUnitario),
  }));
  const total = round2(detalles.reduce((acc, d) => acc + d.subtotal, 0));
  return { detalles, total };
}

/**
 * Valida el stock de todos los ítems contra el stock disponible.
 * RN-01: la venta descuenta stock · RN-02: no se permite stock negativo.
 * Devuelve la lista de errores (vacía si todo es válido).
 */
export function validarStockVenta(
  items: ItemVenta[],
  stocks: Map<number, number>,
  nombres: Map<number, string>,
): string[] {
  const errores: string[] = [];

  // Cantidades acumuladas por producto (un producto puede repetirse en líneas)
  const porProducto = new Map<number, number>();
  for (const item of items) {
    if (item.cantidad <= 0) {
      errores.push(`Cantidad inválida para ${nombres.get(item.productoId) ?? item.productoId}`);
      continue;
    }
    porProducto.set(item.productoId, (porProducto.get(item.productoId) ?? 0) + item.cantidad);
  }

  for (const [productoId, cantidad] of porProducto) {
    const stock = stocks.get(productoId) ?? 0;
    if (cantidad > stock) {
      const nombre = nombres.get(productoId) ?? `producto ${productoId}`;
      errores.push(`Stock insuficiente para ${nombre}: disponible ${stock}, solicitado ${cantidad}`);
    }
  }
  return errores;
}
