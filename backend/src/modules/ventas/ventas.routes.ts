import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './ventas.controller';

// RF-13, RF-15, RF-16. Operan administrador y operador de ventas (CU-04).
// Las ventas importadas (origen vessi/excel) son de solo lectura (RN-04):
// no existe endpoint de edición de ventas.
export const ventasRouter = Router();

ventasRouter.use(authenticate, requireRole('admin', 'ventas'));

// Rutas fijas antes que '/:id'
ventasRouter.get('/formas-pago', asyncHandler(controller.formasPago));
ventasRouter.get('/', asyncHandler(controller.listar));
ventasRouter.get('/:id', asyncHandler(controller.obtener));
ventasRouter.post('/', asyncHandler(controller.crear));
