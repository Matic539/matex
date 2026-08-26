import type { Request, Response } from 'express';
import { demandaSchema, granularidadSchema } from './predicciones.schemas';
import * as service from './predicciones.service';

// GET /api/v1/predicciones/cobertura — tabla "¿cuándo se acaba el stock?" (RF-23/RF-27)
export async function cobertura(_req: Request, res: Response): Promise<void> {
  res.json({ data: await service.cobertura() });
}

// GET /api/v1/predicciones/demanda?nivel=&id=&granularidad=&historia= (RF-22)
export async function demanda(req: Request, res: Response): Promise<void> {
  const { nivel, id, granularidad, historia } = demandaSchema.parse(req.query);
  res.json({ data: await service.demanda(nivel, id, granularidad, historia) });
}

// GET /api/v1/predicciones/metricas?granularidad= (RF-24)
export async function metricas(req: Request, res: Response): Promise<void> {
  const { granularidad } = granularidadSchema.parse(req.query);
  res.json({ data: await service.metricas(granularidad) });
}
