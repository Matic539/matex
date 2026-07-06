import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './categorias.controller';

// RF-06. Lectura: cualquier usuario autenticado (necesaria para filtros y ventas).
// Escritura: solo administrador (CU-02, RN-05).
export const categoriasRouter = Router();

categoriasRouter.use(authenticate);

categoriasRouter.get('/', asyncHandler(controller.listar));
categoriasRouter.post('/', requireRole('admin'), asyncHandler(controller.crear));
categoriasRouter.put('/:id', requireRole('admin'), asyncHandler(controller.actualizar));
categoriasRouter.patch('/:id/estado', requireRole('admin'), asyncHandler(controller.cambiarEstado));
