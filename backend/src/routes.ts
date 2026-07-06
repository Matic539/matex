import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usuariosRouter } from './modules/usuarios/usuarios.routes';
import { categoriasRouter } from './modules/categorias/categorias.routes';
import { productosRouter } from './modules/productos/productos.routes';
import { proveedoresRouter } from './modules/proveedores/proveedores.routes';

// Router raíz /api/v1 — cada módulo de dominio monta aquí sus rutas.
// Fase 3: inventario, ventas · Fase 4: reportes
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/categorias', categoriasRouter);
apiRouter.use('/productos', productosRouter);
apiRouter.use('/proveedores', proveedoresRouter);
