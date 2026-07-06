import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usuariosRouter } from './modules/usuarios/usuarios.routes';
import { categoriasRouter } from './modules/categorias/categorias.routes';
import { productosRouter } from './modules/productos/productos.routes';
import { proveedoresRouter } from './modules/proveedores/proveedores.routes';
import { inventarioRouter } from './modules/inventario/inventario.routes';
import { ventasRouter } from './modules/ventas/ventas.routes';

// Router raíz /api/v1 — cada módulo de dominio monta aquí sus rutas.
// Fase 4: reportes · Post-prototipo: sync-vessi
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/categorias', categoriasRouter);
apiRouter.use('/productos', productosRouter);
apiRouter.use('/proveedores', proveedoresRouter);
apiRouter.use('/inventario', inventarioRouter);
apiRouter.use('/ventas', ventasRouter);
