import { z } from 'zod';

export const rangoFechasSchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

export const dashboardSchema = z.object({
  dias: z.coerce.number().int().positive().max(365).default(30),
});

export const proyeccionSchema = z.object({
  // Ventana de historia para el promedio móvil (RF-27 provisional)
  ventanaDias: z.coerce.number().int().positive().max(365).default(30),
  // Horizonte de cobertura objetivo para la sugerencia de reposición
  horizonteDias: z.coerce.number().int().positive().max(180).default(30),
});

/** Convierte Date a fecha_id AAAAMMDD (formato de dim_tiempo) */
export function aFechaId(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Rango por defecto: últimos `dias` días hasta hoy */
export function rangoPorDefecto(desde?: Date, hasta?: Date, dias = 90) {
  const hastaF = hasta ?? new Date();
  const desdeF = desde ?? new Date(hastaF.getTime() - dias * 24 * 60 * 60 * 1000);
  return { desdeId: aFechaId(desdeF), hastaId: aFechaId(hastaF) };
}
