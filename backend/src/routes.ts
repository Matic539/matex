import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usuariosRouter } from './modules/usuarios/usuarios.routes';
import { categoriasRouter } from './modules/categorias/categorias.routes';
import { productosRouter } from './modules/productos/productos.routes';
import { proveedoresRouter } from './modules/proveedores/proveedores.routes';
import { inventarioRouter } from './modules/inventario/inventario.routes';
import { ventasRouter } from './modules/ventas/ventas.routes';
import { reportesRouter } from './modules/reportes/reportes.routes';
import { syncVessiRouter } from './modules/sync-vessi/sync-vessi.routes';

// Router raíz /api/v1 — cada módulo de dominio monta aquí sus rutas.
// Post-prototipo: sync-vessi (RF-14, RF-19 a RF-21)
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/categorias', categoriasRouter);
apiRouter.use('/productos', productosRouter);
apiRouter.use('/proveedores', proveedoresRouter);
apiRouter.use('/inventario', inventarioRouter);
apiRouter.use('/ventas', ventasRouter);
apiRouter.use('/reportes', reportesRouter);
apiRouter.use('/sync-vessi', syncVessiRouter);
