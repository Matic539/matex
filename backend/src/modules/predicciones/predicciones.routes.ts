import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './predicciones.controller';

// Módulo predictivo (RF-22, RF-23, RF-24) — PDP-02 P5.
// Cobertura de stock: también para encargado de bodega (decisión de
// reposición es operación de inventario). Demanda y métricas: admin.
export const prediccionesRouter = Router();

prediccionesRouter.use(authenticate);

prediccionesRouter.get(
  '/cobertura',
  requireRole('admin', 'inventario'),
  asyncHandler(controller.cobertura),
);
prediccionesRouter.get('/demanda', requireRole('admin'), asyncHandler(controller.demanda));
prediccionesRouter.get('/metricas', requireRole('admin'), asyncHandler(controller.metricas));
