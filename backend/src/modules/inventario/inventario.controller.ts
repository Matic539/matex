import type { Request, Response } from 'express';
import { crearMovimientoSchema, listarMovimientosSchema } from './inventario.schemas';
import * as service from './inventario.service';

// POST /api/v1/inventario/movimientos
export async function crearMovimiento(req: Request, res: Response): Promise<void> {
  const input = crearMovimientoSchema.parse(req.body);
  res.status(201).json({ data: await service.crearMovimiento(input, req.user!.id) });
}

// GET /api/v1/inventario/movimientos
export async function listarMovimientos(req: Request, res: Response): Promise<void> {
  const input = listarMovimientosSchema.parse(req.query);
  const { data, meta } = await service.listarMovimientos(input);
  res.json({ data, meta });
}

// GET /api/v1/inventario/alertas
export async function alertas(_req: Request, res: Response): Promise<void> {
  res.json({ data: await service.alertas() });
}
