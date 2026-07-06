import { z } from 'zod';

export const crearCategoriaSchema = z.object({
  nombre: z.string().min(2).max(80),
  descripcion: z.string().max(500).optional(),
});

export const actualizarCategoriaSchema = crearCategoriaSchema.partial();

export const estadoSchema = z.object({ activo: z.boolean() });

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
