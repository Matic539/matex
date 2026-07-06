import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import type { z } from 'zod';
import type { actualizarProveedorSchema, crearProveedorSchema } from './proveedores.schemas';

type CrearInput = z.infer<typeof crearProveedorSchema>;
type ActualizarInput = z.infer<typeof actualizarProveedorSchema>;

// RF-18: gestión de proveedores

export function listar(incluirInactivos: boolean) {
  return prisma.proveedor.findMany({
    where: incluirInactivos ? {} : { activo: true },
    orderBy: { nombre: 'asc' },
  });
}

export function crear(input: CrearInput) {
  return prisma.proveedor.create({ data: input });
}

export async function actualizar(id: number, input: ActualizarInput) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id } });
  if (!proveedor) throw HttpError.notFound('Proveedor no encontrado');
  return prisma.proveedor.update({ where: { id }, data: input });
}

export async function cambiarEstado(id: number, activo: boolean) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id } });
  if (!proveedor) throw HttpError.notFound('Proveedor no encontrado');
  return prisma.proveedor.update({ where: { id }, data: { activo } });
}
