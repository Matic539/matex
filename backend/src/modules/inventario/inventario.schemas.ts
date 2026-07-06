import { z } from 'zod';

// Movimientos manuales: entrada (recepción) o ajuste (+/-).
// Las salidas por venta las genera el módulo de ventas (RN-01).
export const crearMovimientoSchema = z.object({
  productoId: z.number().int().positive(),
  tipo: z.enum(['entrada', 'ajuste']),
  cantidad: z.number().refine((n) => n !== 0, 'La cantidad no puede ser cero'),
  proveedorId: z.number().int().positive().optional(),
  observacion: z.string().max(500).optional(),
});

export const listarMovimientosSchema = z.object({
  productoId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(['entrada', 'salida_venta', 'ajuste']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CrearMovimientoInput = z.infer<typeof crearMovimientoSchema>;
export type ListarMovimientosInput = z.infer<typeof listarMovimientosSchema>;
