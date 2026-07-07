import { prisma } from '../../lib/prisma';

// ============================================================
// PUNTO DE EXTENSIÓN — Integración Vessi (RF-14, RF-19 a RF-21)
// ============================================================
// Este módulo es un STUB: define el contrato que implementará el
// servicio real de sincronización cuando se confirmen las capacidades
// de la API de Vessi (supuesto crítico del proyecto, SRS §2.5).
//
// Diseño previsto (CU-05):
//  1. El planificador (cron) llama a ejecutarSincronizacion().
//  2. El proveedor consulta a Vessi las ventas del período pendiente.
//  3. Cada venta se valida y se descarta si ya existe (idempotencia
//     por venta.vessi_id UNIQUE — RF-21).
//  4. Las ventas nuevas se insertan con origen='vessi' reutilizando la
//     transacción de ventas.service (RN-01: descuento de stock).
//     Son de solo lectura en el sistema (RN-04).
//  5. El resultado queda trazado en operacional.log_sincronizacion
//     (RF-20) y los errores se reintentan según política (RNF-10).

/** Contrato del proveedor de sincronización de ventas externas */
export interface SyncProvider {
  nombre: string;
  /** Obtiene ventas del sistema externo desde una fecha dada */
  obtenerVentas(desde: Date): Promise<VentaExterna[]>;
}

export interface VentaExterna {
  idExterno: string; // → venta.vessi_id (idempotencia RF-21)
  fecha: Date;
  formaPago: string;
  items: { codigoProducto: string; cantidad: number; precioUnitario: number }[];
}

// RF-20: historial de sincronizaciones (la tabla ya existe en BD)
export function listarLogs() {
  return prisma.logSincronizacion.findMany({
    orderBy: { fechaInicio: 'desc' },
    take: 50,
  });
}
