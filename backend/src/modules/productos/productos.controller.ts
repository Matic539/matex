import type { Request, Response } from 'express';
import {
  actualizarProductoSchema,
  crearProductoSchema,
  estadoSchema,
  idParamSchema,
  listarProductosSchema,
  nuevoPrecioSchema,
} from './productos.schemas';
import * as service from './productos.service';

export async function listar(req: Request, res: Response): Promise<void> {
  const input = listarProductosSchema.parse(req.query);
  const { data, meta } = await service.listar(input);
  res.json({ data, meta });
}

export async function obtener(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.obtener(id) });
}

export async function crear(req: Request, res: Response): Promise<void> {
  const input = crearProductoSchema.parse(req.body);
  res.status(201).json({ data: await service.crear(input) });
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = actualizarProductoSchema.parse(req.body);
  res.json({ data: await service.actualizar(id, input) });
}

export async function cambiarEstado(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { activo } = estadoSchema.parse(req.body);
  res.json({ data: await service.cambiarEstado(id, activo) });
}

export async function historialPrecios(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.historialPrecios(id) });
}

export async function nuevoPrecio(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = nuevoPrecioSchema.parse(req.body);
  res.status(201).json({ data: await service.nuevoPrecio(id, input) });
}
