import { api } from './client';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  totalProductos?: number;
}

export interface CategoriaInput {
  nombre: string;
  descripcion?: string;
}

export const categoriasApi = {
  listar: (incluirInactivas = false) =>
    api.get<Categoria[]>(`/categorias${incluirInactivas ? '?incluirInactivas=true' : ''}`),
  crear: (input: CategoriaInput) => api.post<Categoria>('/categorias', input),
  actualizar: (id: number, input: Partial<CategoriaInput>) =>
    api.put<Categoria>(`/categorias/${id}`, input),
  cambiarEstado: (id: number, activo: boolean) =>
    api.patch<Categoria>(`/categorias/${id}/estado`, { activo }),
};
