import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as service from './sync-vessi.service';

// STUB de integración Vessi (ver sync-vessi.service.ts).
// Fuera del alcance del prototipo según PDP-01 §6.
export const syncVessiRouter = Router();

syncVessiRouter.use(authenticate, requireRole('admin'));

// RF-20: consultar historial de sincronizaciones
syncVessiRouter.get(
  '/logs',
  asyncHandler(async (_req, res) => {
    res.json({ data: await service.listarLogs() });
  }),
);

// RF-14/RF-19: la sincronización aún no está implementada
syncVessiRouter.post('/ejecutar', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message:
        'La integración con Vessi está planificada para la fase 4 del proyecto (sep-nov 2026), pendiente de la confirmación de acceso a la API.',
    },
  });
});
