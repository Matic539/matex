import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import type { ActualizarUsuarioInput, CrearUsuarioInput } from './usuarios.schemas';

// Nunca exponer passwordHash en las respuestas
const usuarioPublico = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
} as const;

export function listar() {
  return prisma.usuario.findMany({
    select: usuarioPublico,
    orderBy: { id: 'asc' },
  });
}

// RF-03: crear usuario (solo admin)
export async function crear(input: CrearUsuarioInput) {
  const existente = await prisma.usuario.findUnique({ where: { email: input.email } });
  if (existente) throw HttpError.conflict('Ya existe un usuario con ese email');

  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.usuario.create({
    data: { nombre: input.nombre, email: input.email, rol: input.rol, passwordHash },
    select: usuarioPublico,
  });
}

// RF-03: editar usuario
export async function actualizar(id: number, input: ActualizarUsuarioInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw HttpError.notFound('Usuario no encontrado');

  if (input.email && input.email !== usuario.email) {
    const conEmail = await prisma.usuario.findUnique({ where: { email: input.email } });
    if (conEmail) throw HttpError.conflict('Ya existe un usuario con ese email');
  }

  const data: Record<string, unknown> = {
    nombre: input.nombre,
    email: input.email,
    rol: input.rol,
  };
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.usuario.update({ where: { id }, data, select: usuarioPublico });
}

// RF-03: activar/desactivar (nunca se elimina físicamente)
export async function cambiarEstado(id: number, activo: boolean, solicitanteId: number) {
  if (id === solicitanteId && !activo) {
    throw HttpError.conflict('No puedes desactivar tu propia cuenta');
  }
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw HttpError.notFound('Usuario no encontrado');

  return prisma.usuario.update({ where: { id }, data: { activo }, select: usuarioPublico });
}
