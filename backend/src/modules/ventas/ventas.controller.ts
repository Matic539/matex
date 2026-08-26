import type { Request, Response } from 'express';
import { crearVentaSchema, idParamSchema, listarVentasSchema } from './ventas.schemas';
import * as service from './ventas.service';

export async function crear(req: Request, res: Response): Promise<void> {
  const input = crearVentaSchema.parse(req.body);
  res.status(201).json({ data: await service.crear(input, req.user!.id) });
}

export async function listar(req: Request, res: Response): Promise<void> {
  const input = listarVentasSchema.parse(req.query);
  const { data, meta } = await service.listar(input);
  res.json({ data, meta });
}

export async function obtener(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.obtener(id) });
}

export async function formasPago(_req: Request, res: Response): Promise<void> {
  res.json({ data: await service.formasPago() });
}

// PATCH /api/v1/ventas/:id/anular
export async function anular(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.anular(id, req.user!.id) });
}
