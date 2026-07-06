import { z } from 'zod';

export const crearProveedorSchema = z.object({
  nombre: z.string().min(2).max(150),
  contacto: z.string().max(100).optional(),
  telefono: z.string().max(30).optional(),
  email: z.string().email().max(150).optional().or(z.literal('').transform(() => undefined)),
});

export const actualizarProveedorSchema = crearProveedorSchema.partial();

export const estadoSchema = z.object({ activo: z.boolean() });
export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
