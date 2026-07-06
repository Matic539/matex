import { z } from 'zod';

// IVA vigente en Chile (para calcular precio bruto si no se entrega)
export const IVA = 0.19;

export const crearProductoSchema = z.object({
  codigo: z.string().min(1).max(30),
  nombre: z.string().min(2).max(120),
  categoriaId: z.number().int().positive(),
  unidadMedida: z.string().min(1).max(20),
  dimensiones: z.string().max(60).optional(),
  stockMinimo: z.number().min(0).default(0),
  // Precio inicial opcional al crear (RF-05/RF-07)
  precioNeto: z.number().positive().optional(),
  precioBruto: z.number().positive().optional(),
});

export const actualizarProductoSchema = z.object({
  codigo: z.string().min(1).max(30).optional(),
  nombre: z.string().min(2).max(120).optional(),
  categoriaId: z.number().int().positive().optional(),
  unidadMedida: z.string().min(1).max(20).optional(),
  dimensiones: z.string().max(60).nullable().optional(),
  stockMinimo: z.number().min(0).optional(),
});

export const nuevoPrecioSchema = z.object({
  precioNeto: z.number().positive(),
  precioBruto: z.number().positive().optional(),
  vigenteDesde: z.coerce.date().optional(), // default: hoy
});

export const listarProductosSchema = z.object({
  buscar: z.string().max(120).optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  incluirInactivos: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const estadoSchema = z.object({ activo: z.boolean() });
export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
export type NuevoPrecioInput = z.infer<typeof nuevoPrecioSchema>;
export type ListarProductosInput = z.infer<typeof listarProductosSchema>;
