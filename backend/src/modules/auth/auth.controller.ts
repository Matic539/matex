import type { Request, Response } from 'express';
import { loginSchema } from './auth.schemas';
import * as authService from './auth.service';

// POST /api/v1/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json({ data: result });
}

// GET /api/v1/auth/me — usuario de la sesión actual
export async function me(req: Request, res: Response): Promise<void> {
  res.json({ data: req.user });
}
