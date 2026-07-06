import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/auth.middleware';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', asyncHandler(controller.login));
authRouter.get('/me', authenticate, asyncHandler(controller.me));

// Nota RF-04: con JWT el logout es responsabilidad del cliente (descartar el
// token). La expiración por inactividad se maneja en el frontend; la
// expiración absoluta la impone JWT_EXPIRES_IN.
