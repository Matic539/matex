import { z } from 'zod';
import { ROLES } from '../../types/auth';

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email().max(150),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rol: z.enum(ROLES),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  password: z.string().min(8).optional(), // solo si se quiere cambiar
  rol: z.enum(ROLES).optional(),
});

export const estadoUsuarioSchema = z.object({
  activo: z.boolean(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
