import { api } from './client';

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

export interface ProveedorInput {
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

export const proveedoresApi = {
  listar: (incluirInactivos = false) =>
    api.get<Proveedor[]>(`/proveedores${incluirInactivos ? '?incluirInactivos=true' : ''}`),
  crear: (input: ProveedorInput) => api.post<Proveedor>('/proveedores', input),
  actualizar: (id: number, input: Partial<ProveedorInput>) =>
    api.put<Proveedor>(`/proveedores/${id}`, input),
  cambiarEstado: (id: number, activo: boolean) =>
    api.patch<Proveedor>(`/proveedores/${id}/estado`, { activo }),
};
