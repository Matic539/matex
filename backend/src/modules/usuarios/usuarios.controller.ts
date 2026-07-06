import type { Request, Response } from 'express';
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  estadoUsuarioSchema,
  idParamSchema,
} from './usuarios.schemas';
import * as service from './usuarios.service';

// GET /api/v1/usuarios
export async function listar(_req: Request, res: Response): Promise<void> {
  res.json({ data: await service.listar() });
}

// POST /api/v1/usuarios
export async function crear(req: Request, res: Response): Promise<void> {
  const input = crearUsuarioSchema.parse(req.body);
  res.status(201).json({ data: await service.crear(input) });
}

// PUT /api/v1/usuarios/:id
export async function actualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = actualizarUsuarioSchema.parse(req.body);
  res.json({ data: await service.actualizar(id, input) });
}

// PATCH /api/v1/usuarios/:id/estado
export async function cambiarEstado(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { activo } = estadoUsuarioSchema.parse(req.body);
  res.json({ data: await service.cambiarEstado(id, activo, req.user!.id) });
}
