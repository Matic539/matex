import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../utils/http-error';
import type { AuthUser, Rol } from '../../types/auth';
import type { LoginInput } from './auth.schemas';

export interface LoginResult {
  token: string;
  usuario: AuthUser;
}

// RF-01: inicio de sesión con email y contraseña.
// Mensaje de error único para no revelar si el email existe (buena práctica).
export async function login({ email, password }: LoginInput): Promise<LoginResult> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  const credencialesInvalidas = HttpError.unauthorized('Credenciales inválidas');
  if (!usuario || !usuario.activo) throw credencialesInvalidas;

  const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordOk) throw credencialesInvalidas;

  const authUser: AuthUser = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol as Rol,
  };

  const token = jwt.sign(
    { sub: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] },
  );

  return { token, usuario: authUser };
}
