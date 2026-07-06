import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Rol } from '@/types/auth';

// Protege rutas: requiere sesión y, opcionalmente, roles específicos (RNF-03).
export function ProtectedRoute({ roles }: { roles?: Rol[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;

  return <Outlet />;
}
