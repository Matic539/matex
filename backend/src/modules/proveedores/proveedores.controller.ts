import type { Request, Response } from 'express';
import {
  actualizarProveedorSchema,
  crearProveedorSchema,
  estadoSchema,
  idParamSchema,
} from './proveedores.schemas';
import * as service from './proveedores.service';

export async function listar(req: Request, res: Response): Promise<void> {
  const incluirInactivos = req.query.incluirInactivos === 'true';
  res.json({ data: await service.listar(incluirInactivos) });
}

export async function crear(req: Request, res: Response): Promise<void> {
  const input = crearProveedorSchema.parse(req.body);
  res.status(201).json({ data: await service.crear(input) });
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = actualizarProveedorSchema.parse(req.body);
  res.json({ data: await service.actualizar(id, input) });
}

export async function cambiarEstado(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { activo } = estadoSchema.parse(req.body);
  res.json({ data: await service.cambiarEstado(id, activo) });
}
