import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import type { z } from 'zod';
import type { actualizarCategoriaSchema, crearCategoriaSchema } from './categorias.schemas';

type CrearInput = z.infer<typeof crearCategoriaSchema>;
type ActualizarInput = z.infer<typeof actualizarCategoriaSchema>;

// RF-06: gestión de categorías. RN-03: cada producto pertenece a una categoría.

export async function listar(incluirInactivas: boolean) {
  const categorias = await prisma.categoria.findMany({
    where: incluirInactivas ? {} : { activo: true },
    include: { _count: { select: { productos: true } } },
    orderBy: { nombre: 'asc' },
  });
  return categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    activo: c.activo,
    totalProductos: c._count.productos,
  }));
}

export async function crear(input: CrearInput) {
  const existente = await prisma.categoria.findUnique({ where: { nombre: input.nombre } });
  if (existente) throw HttpError.conflict('Ya existe una categoría con ese nombre');
  return prisma.categoria.create({ data: input });
}

export async function actualizar(id: number, input: ActualizarInput) {
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria) throw HttpError.notFound('Categoría no encontrada');

  if (input.nombre && input.nombre !== categoria.nombre) {
    const conNombre = await prisma.categoria.findUnique({ where: { nombre: input.nombre } });
    if (conNombre) throw HttpError.conflict('Ya existe una categoría con ese nombre');
  }
  return prisma.categoria.update({ where: { id }, data: input });
}

export async function cambiarEstado(id: number, activo: boolean) {
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { _count: { select: { productos: { where: { activo: true } } } } },
  });
  if (!categoria) throw HttpError.notFound('Categoría no encontrada');

  // No desactivar categorías con productos activos (integridad operativa)
  if (!activo && categoria._count.productos > 0) {
    throw HttpError.conflict(
      `La categoría tiene ${categoria._count.productos} producto(s) activo(s). Reasígnalos o desactívalos primero.`,
    );
  }
  return prisma.categoria.update({ where: { id }, data: { activo } });
}
