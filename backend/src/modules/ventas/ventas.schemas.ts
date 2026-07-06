import { z } from 'zod';

export const crearVentaSchema = z.object({
  formaPagoId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidad: z.number().positive(),
        // Editable en el formulario; si se omite se usa el precio vigente (bruto)
        precioUnitario: z.number().positive().optional(),
      }),
    )
    .min(1, 'La venta debe tener al menos un producto'),
});

export const listarVentasSchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  origen: z.enum(['manual', 'vessi', 'excel']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type CrearVentaInput = z.infer<typeof crearVentaSchema>;
export type ListarVentasInput = z.infer<typeof listarVentasSchema>;
