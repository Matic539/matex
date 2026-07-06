import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './inventario.controller';

// RF-09 a RF-12. Gestión: administrador y encargado de bodega (CU-03).
export const inventarioRouter = Router();

inventarioRouter.use(authenticate, requireRole('admin', 'inventario'));

inventarioRouter.get('/movimientos', asyncHandler(controller.listarMovimientos));
inventarioRouter.post('/movimientos', asyncHandler(controller.crearMovimiento));
inventarioRouter.get('/alertas', asyncHandler(controller.alertas));
