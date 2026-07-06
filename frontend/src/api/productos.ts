import { api } from './client';

export interface PrecioVigente {
  neto: number;
  bruto: number;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: { id: number; nombre: string };
  unidadMedida: string;
  dimensiones: string | null;
  stockMinimo: number;
  stockActual: number;
  bajoMinimo: boolean;
  precioVigente: PrecioVigente | null;
  activo: boolean;
}

export interface PrecioHistorial {
  id: number;
  precioNeto: number;
  precioBruto: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  vigente: boolean;
}

export interface ProductoInput {
  codigo: string;
  nombre: string;
  categoriaId: number;
  unidadMedida: string;
  dimensiones?: string;
  stockMinimo: number;
  precioNeto?: number; // solo al crear
}

export interface FiltrosProductos {
  buscar?: string;
  categoriaId?: number;
  incluirInactivos?: boolean;
  page?: number;
  pageSize?: number;
}

function queryString(f: FiltrosProductos): string {
  const params = new URLSearchParams();
  if (f.buscar) params.set('buscar', f.buscar);
  if (f.categoriaId) params.set('categoriaId', String(f.categoriaId));
  if (f.incluirInactivos) params.set('incluirInactivos', 'true');
  if (f.page) params.set('page', String(f.page));
  if (f.pageSize) params.set('pageSize', String(f.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const productosApi = {
  listar: (filtros: FiltrosProductos = {}) =>
    api.getPaged<Producto[]>(`/productos${queryString(filtros)}`),
  obtener: (id: number) => api.get<Producto>(`/productos/${id}`),
  crear: (input: ProductoInput) => api.post<Producto>('/productos', input),
  actualizar: (id: number, input: Partial<Omit<ProductoInput, 'precioNeto'>>) =>
    api.put<Producto>(`/productos/${id}`, input),
  cambiarEstado: (id: number, activo: boolean) =>
    api.patch<Producto>(`/productos/${id}/estado`, { activo }),
  historialPrecios: (id: number) => api.get<PrecioHistorial[]>(`/productos/${id}/precios`),
  nuevoPrecio: (id: number, precioNeto: number, vigenteDesde?: string) =>
    api.post<PrecioHistorial>(`/productos/${id}/precios`, { precioNeto, vigenteDesde }),
};
