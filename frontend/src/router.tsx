import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { Placeholder } from '@/pages/Placeholder';

// Rutas del prototipo. La protección por autenticación/rol se agrega en fase 1.
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'productos', element: <Placeholder titulo="Productos" fase="fase 2" /> },
      { path: 'categorias', element: <Placeholder titulo="Categorías" fase="fase 2" /> },
      { path: 'proveedores', element: <Placeholder titulo="Proveedores" fase="fase 2" /> },
      { path: 'inventario', element: <Placeholder titulo="Inventario" fase="fase 3" /> },
      { path: 'ventas', element: <Placeholder titulo="Ventas" fase="fase 3" /> },
      { path: 'reportes', element: <Placeholder titulo="Reportes" fase="fase 4" /> },
      { path: 'usuarios', element: <Placeholder titulo="Usuarios" fase="fase 1" /> },
    ],
  },
]);
