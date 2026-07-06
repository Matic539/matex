import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './productos.controller';

// RF-05, RF-07, RF-08. Lectura: todos los roles (ventas y bodega consultan).
// Creación/edición de productos y precios: solo administrador (CU-02, RN-05).
export const productosRouter = Router();

productosRouter.use(authenticate);

productosRouter.get('/', asyncHandler(controller.listar));
productosRouter.get('/:id', asyncHandler(controller.obtener));
productosRouter.get('/:id/precios', asyncHandler(controller.historialPrecios));

productosRouter.post('/', requireRole('admin'), asyncHandler(controller.crear));
productosRouter.put('/:id', requireRole('admin'), asyncHandler(controller.actualizar));
productosRouter.patch('/:id/estado', requireRole('admin'), asyncHandler(controller.cambiarEstado));
productosRouter.post('/:id/precios', requireRole('admin'), asyncHandler(controller.nuevoPrecio));
