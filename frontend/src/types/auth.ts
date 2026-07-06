export const ROLES = ['admin', 'ventas', 'inventario'] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_LABELS: Record<Rol, string> = {
  admin: 'Administrador',
  ventas: 'Operador de ventas',
  inventario: 'Encargado de bodega',
};

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}
