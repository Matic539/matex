import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes';

// Router raíz /api/v1 — cada módulo de dominio monta aquí sus rutas.
// Fase 1: auth, usuarios · Fase 2: categorias, productos, proveedores
// Fase 3: inventario, ventas · Fase 4: reportes
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
