import { z } from 'zod';

export const granularidadSchema = z.object({
  granularidad: z.enum(['semanal', 'mensual']).default('semanal'),
});

export const demandaSchema = z.object({
  nivel: z.enum(['producto', 'categoria']).default('producto'),
  id: z.coerce.number().int().positive(),
  granularidad: z.enum(['semanal', 'mensual']).default('semanal'),
  // períodos de historia a mostrar junto a la predicción
  historia: z.coerce.number().int().positive().max(104).default(26),
});
