import type { Request, Response } from 'express';
import { dashboardSchema, proyeccionSchema, rangoFechasSchema } from './reportes.schemas';
import * as service from './reportes.service';

// POST /api/v1/reportes/refresh
export async function refrescar(_req: Request, res: Response): Promise<void> {
  res.json({ data: await service.refrescar() });
}

// GET /api/v1/reportes/dashboard?dias=30
export async function dashboard(req: Request, res: Response): Promise<void> {
  const { dias } = dashboardSchema.parse(req.query);
  res.json({ data: await service.dashboard(dias) });
}

// GET /api/v1/reportes/rotacion?desde=&hasta=
export async function rotacion(req: Request, res: Response): Promise<void> {
  const { desde, hasta } = rangoFechasSchema.parse(req.query);
  res.json({ data: await service.rotacion(desde, hasta) });
}

// GET /api/v1/reportes/ventas-categoria?desde=&hasta=
export async function ventasPorCategoria(req: Request, res: Response): Promise<void> {
  const { desde, hasta } = rangoFechasSchema.parse(req.query);
  res.json({ data: await service.ventasPorCategoria(desde, hasta) });
}

// GET /api/v1/reportes/proyeccion-stock?ventanaDias=30&horizonteDias=30
export async function proyeccionStock(req: Request, res: Response): Promise<void> {
  const { ventanaDias, horizonteDias } = proyeccionSchema.parse(req.query);
  res.json({ data: await service.proyeccionStock(ventanaDias, horizonteDias) });
}
