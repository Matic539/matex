import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Users,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ROL_LABELS, type Rol } from '@/types/auth';
import { Button } from '@/components/ui/button';

// Navegación principal con visibilidad por rol (RF-02, RNF-03)
const navItems: { to: string; label: string; icon: typeof Package; roles: Rol[]; end?: boolean }[] =
  [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'], end: true },
    { to: '/productos', label: 'Productos', icon: Package, roles: ['admin', 'ventas', 'inventario'] },
    { to: '/categorias', label: 'Categorías', icon: Tags, roles: ['admin'] },
    { to: '/inventario', label: 'Inventario', icon: Warehouse, roles: ['admin', 'inventario'] },
    { to: '/ventas', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'ventas'] },
    { to: '/proveedores', label: 'Proveedores', icon: Truck, roles: ['admin', 'inventario'] },
    { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin'] },
    { to: '/predicciones', label: 'Predicciones', icon: TrendingUp, roles: ['admin', 'inventario'] },
    { to: '/usuarios', label: 'Usuarios', icon: Users, roles: ['admin'] },
  ];

export function AppLayout() {
  const { user, logout } = useAuth();
  const visibles = navItems.filter((item) => user && item.roles.includes(user.rol));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center border-b px-5">
          <span className="text-lg font-bold tracking-tight">Matex</span>
          <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            prototipo
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visibles.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          Sistema de Gestión y Análisis de Datos
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="text-sm font-medium text-muted-foreground md:hidden">Matex</span>
          <div className="ml-auto flex items-center gap-4">
            {user && (
              <div className="text-right text-sm leading-tight">
                <p className="font-medium">{user.nombre}</p>
                <p className="text-xs text-muted-foreground">{ROL_LABELS[user.rol]}</p>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={logout} title="Cerrar sesión">
              <LogOut />
              Salir
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
