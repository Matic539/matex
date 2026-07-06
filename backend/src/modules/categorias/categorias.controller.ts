import type { Request, Response } from 'express';
import {
  actualizarCategoriaSchema,
  crearCategoriaSchema,
  estadoSchema,
  idParamSchema,
} from './categorias.schemas';
import * as service from './categorias.service';

export async function listar(req: Request, res: Response): Promise<void> {
  const incluirInactivas = req.query.incluirInactivas === 'true';
  res.json({ data: await service.listar(incluirInactivas) });
}

export async function crear(req: Request, res: Response): Promise<void> {
  const input = crearCategoriaSchema.parse(req.body);
  res.status(201).json({ data: await service.crear(input) });
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = actualizarCategoriaSchema.parse(req.body);
  res.json({ data: await service.actualizar(id, input) });
}

export async function cambiarEstado(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { activo } = estadoSchema.parse(req.body);
  res.json({ data: await service.cambiarEstado(id, activo) });
}
