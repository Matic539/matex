import { api } from './client';
import type { Rol } from '@/types/auth';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

export type ActualizarUsuarioInput = Partial<CrearUsuarioInput>;

export const usuariosApi = {
  listar: () => api.get<Usuario[]>('/usuarios'),
  crear: (input: CrearUsuarioInput) => api.post<Usuario>('/usuarios', input),
  actualizar: (id: number, input: ActualizarUsuarioInput) =>
    api.put<Usuario>(`/usuarios/${id}`, input),
  cambiarEstado: (id: number, activo: boolean) =>
    api.patch<Usuario>(`/usuarios/${id}/estado`, { activo }),
};
