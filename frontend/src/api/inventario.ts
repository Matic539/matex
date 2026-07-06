import { api } from './client';

export interface Movimiento {
  id: number;
  fecha: string;
  tipo: 'entrada' | 'salida_venta' | 'ajuste';
  cantidad: number;
  producto: { id: number; codigo: string; nombre: string; unidadMedida: string };
  proveedor: { id: number; nombre: string } | null;
  usuario: { id: number; nombre: string } | null;
  ventaId: number | null;
  observacion: string | null;
}

export interface AlertaStock {
  id: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: number;
  stockActual: number;
}

export interface MovimientoInput {
  productoId: number;
  tipo: 'entrada' | 'ajuste';
  cantidad: number;
  proveedorId?: number;
  observacion?: string;
}

export interface FiltrosMovimientos {
  productoId?: number;
  tipo?: string;
  page?: number;
  pageSize?: number;
}

function qs(f: FiltrosMovimientos): string {
  const p = new URLSearchParams();
  if (f.productoId) p.set('productoId', String(f.productoId));
  if (f.tipo) p.set('tipo', f.tipo);
  if (f.page) p.set('page', String(f.page));
  if (f.pageSize) p.set('pageSize', String(f.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const inventarioApi = {
  movimientos: (f: FiltrosMovimientos = {}) =>
    api.getPaged<Movimiento[]>(`/inventario/movimientos${qs(f)}`),
  crearMovimiento: (input: MovimientoInput) =>
    api.post<Movimiento & { stockResultante: number }>('/inventario/movimientos', input),
  alertas: () => api.get<AlertaStock[]>('/inventario/alertas'),
};
