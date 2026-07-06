import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Dashboard } from '@/pages/Dashboard';

// Página de inicio según rol: el dashboard es del administrador (RF-28);
// los demás roles aterrizan en su módulo de trabajo.
export function Inicio() {
  const { user } = useAuth();

  if (user?.rol === 'ventas') return <Navigate to="/ventas" replace />;
  if (user?.rol === 'inventario') return <Navigate to="/inventario" replace />;
  return <Dashboard />;
}
