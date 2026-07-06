import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './reportes.controller';

// RF-25 a RF-28. Dashboard y reportes: administrador (CU-07).
export const reportesRouter = Router();

reportesRouter.use(authenticate, requireRole('admin'));

reportesRouter.post('/refresh', asyncHandler(controller.refrescar));
reportesRouter.get('/dashboard', asyncHandler(controller.dashboard));
reportesRouter.get('/rotacion', asyncHandler(controller.rotacion));
reportesRouter.get('/ventas-categoria', asyncHandler(controller.ventasPorCategoria));
reportesRouter.get('/proyeccion-stock', asyncHandler(controller.proyeccionStock));
