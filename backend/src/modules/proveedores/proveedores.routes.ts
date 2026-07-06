import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './proveedores.controller';

// RF-18. Gestión por administrador y encargado de bodega
// (bodega registra recepciones asociadas a proveedores en fase 3).
export const proveedoresRouter = Router();

proveedoresRouter.use(authenticate, requireRole('admin', 'inventario'));

proveedoresRouter.get('/', asyncHandler(controller.listar));
proveedoresRouter.post('/', asyncHandler(controller.crear));
proveedoresRouter.put('/:id', asyncHandler(controller.actualizar));
proveedoresRouter.patch('/:id/estado', asyncHandler(controller.cambiarEstado));
