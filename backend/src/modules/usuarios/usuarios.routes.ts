import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './usuarios.controller';

// Gestión de usuarios: exclusiva del administrador (RF-03, RN-05)
export const usuariosRouter = Router();

usuariosRouter.use(authenticate, requireRole('admin'));

usuariosRouter.get('/', asyncHandler(controller.listar));
usuariosRouter.post('/', asyncHandler(controller.crear));
usuariosRouter.put('/:id', asyncHandler(controller.actualizar));
usuariosRouter.patch('/:id/estado', asyncHandler(controller.cambiarEstado));
