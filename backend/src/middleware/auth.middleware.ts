import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';
import type { AuthUser, Rol } from '../types/auth';

interface TokenPayload {
  sub: number;
  nombre: string;
  email: string;
  rol: Rol;
}

// Verifica el token Bearer y adjunta req.user (RF-01, RNF-03)
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(HttpError.unauthorized('Token no provisto'));
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as unknown as TokenPayload;
    const user: AuthUser = {
      id: payload.sub,
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol,
    };
    req.user = user;
    next();
  } catch {
    next(HttpError.unauthorized('Token inválido o expirado'));
  }
}

// Restringe el acceso a los roles indicados (RF-02, RN-05)
export function requireRole(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(HttpError.unauthorized());
    if (!roles.includes(req.user.rol)) return next(HttpError.forbidden());
    next();
  };
}
