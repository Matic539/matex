// Tipos compartidos de autenticación y autorización (RF-02)

export const ROLES = ['admin', 'ventas', 'inventario'] as const;
export type Rol = (typeof ROLES)[number];

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

// Extiende Request de Express con el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
