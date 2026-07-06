import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';
import { env } from '../config/env';

// 404 para rutas no definidas
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}

// Manejador central de errores → respuesta { error: { code, message, details? } }
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Error no controlado: log completo, respuesta genérica (sin filtrar internals)
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'development' && err instanceof Error
          ? err.message
          : 'Error interno del servidor',
    },
  });
}
