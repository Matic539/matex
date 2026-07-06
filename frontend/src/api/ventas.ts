import { api } from './client';

export interface VentaResumen {
  id: number;
  fecha: string;
  estado: string;
  origen: 'manual' | 'vessi' | 'excel';
  formaPago: string;
  usuario: string | null;
  nItems: number;
  total: number;
}

export interface VentaDetalleItem {
  id: number;
  producto: { id: number; codigo: string; nombre: string; unidadMedida: string };
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta extends Omit<VentaResumen, 'nItems'> {
  detalles: VentaDetalleItem[];
}

export interface FormaPago {
  id: number;
  nombre: string;
}

export interface ItemVentaInput {
  productoId: number;
  cantidad: number;
  precioUnitario?: number;
}

export interface FiltrosVentas {
  desde?: string;
  hasta?: string;
  categoriaId?: number;
  origen?: string;
  page?: number;
  pageSize?: number;
}

function qs(f: FiltrosVentas): string {
  const p = new URLSearchParams();
  if (f.desde) p.set('desde', f.desde);
  if (f.hasta) p.set('hasta', f.hasta);
  if (f.categoriaId) p.set('categoriaId', String(f.categoriaId));
  if (f.origen) p.set('origen', f.origen);
  if (f.page) p.set('page', String(f.page));
  if (f.pageSize) p.set('pageSize', String(f.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const ventasApi = {
  listar: (f: FiltrosVentas = {}) => api.getPaged<VentaResumen[]>(`/ventas${qs(f)}`),
  obtener: (id: number) => api.get<Venta>(`/ventas/${id}`),
  crear: (formaPagoId: number, items: ItemVentaInput[]) =>
    api.post<Venta>('/ventas', { formaPagoId, items }),
  formasPago: () => api.get<FormaPago[]>('/ventas/formas-pago'),
};
