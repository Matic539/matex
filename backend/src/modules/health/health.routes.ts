import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../utils/async-handler';

export const healthRouter = Router();

// GET /api/v1/health — estado del servicio y conexión a BD
healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    let database = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    res.status(database === 'ok' ? 200 : 503).json({
      data: {
        status: database === 'ok' ? 'ok' : 'degraded',
        database,
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      },
    });
  }),
);
