import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Categorias } from '@/pages/Categorias';
import { Inicio } from '@/pages/Inicio';
import { Login } from '@/pages/Login';
import { Placeholder } from '@/pages/Placeholder';
import { ProductoDetalle } from '@/pages/ProductoDetalle';
import { Productos } from '@/pages/Productos';
import { Proveedores } from '@/pages/Proveedores';
import { Usuarios } from '@/pages/Usuarios';

// Acceso por rol (RNF-03). Un rol sin permiso es redirigido a su inicio.
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />, // requiere sesión
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Inicio /> },
          {
            element: <ProtectedRoute roles={['admin', 'ventas', 'inventario']} />,
            children: [
              { path: 'productos', element: <Productos /> },
              { path: 'productos/:id', element: <ProductoDetalle /> },
            ],
          },
          {
            element: <ProtectedRoute roles={['admin']} />,
            children: [
              { path: 'categorias', element: <Categorias /> },
              { path: 'reportes', element: <Placeholder titulo="Reportes" fase="fase 4" /> },
              { path: 'usuarios', element: <Usuarios /> },
            ],
          },
          {
            element: <ProtectedRoute roles={['admin', 'inventario']} />,
            children: [
              { path: 'inventario', element: <Placeholder titulo="Inventario" fase="fase 3" /> },
              { path: 'proveedores', element: <Proveedores /> },
            ],
          },
          {
            element: <ProtectedRoute roles={['admin', 'ventas']} />,
            children: [{ path: 'ventas', element: <Placeholder titulo="Ventas" fase="fase 3" /> }],
          },
        ],
      },
    ],
  },
]);
