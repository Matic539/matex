import { api } from './client';

export interface DashboardData {
  periodoDias: number;
  kpis: {
    monto: number;
    unidades: number;
    transacciones: number;
    productosBajoMinimo: number;
  };
  serieDiaria: { fecha: string; monto: number }[];
  topProductos: { nombre: string; monto: number; unidades: number }[];
  porCategoria: { categoria: string; monto: number }[];
  ultimaActualizacion: string | null;
}

export interface FilaRotacion {
  productoId: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidades_vendidas: number;
  monto_vendido: number;
  stock_promedio: number | null;
  indice_rotacion: number | null;
}

export interface FilaVentasCategoria {
  categoria: string;
  anio: number;
  mes: number;
  monto: number;
  unidades: number;
  transacciones: number;
}

export interface FilaProyeccion {
  productoId: number;
  codigo: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  venta_diaria_promedio: number;
  dias_cobertura: number | null;
  sugerencia_reposicion: number;
}

function rango(desde?: string, hasta?: string): string {
  const p = new URLSearchParams();
  if (desde) p.set('desde', desde);
  if (hasta) p.set('hasta', hasta);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const reportesApi = {
  refresh: () => api.post<{ ultimaActualizacion: string }>('/reportes/refresh', {}),
  dashboard: (dias = 30) => api.get<DashboardData>(`/reportes/dashboard?dias=${dias}`),
  rotacion: (desde?: string, hasta?: string) =>
    api.get<FilaRotacion[]>(`/reportes/rotacion${rango(desde, hasta)}`),
  ventasCategoria: (desde?: string, hasta?: string) =>
    api.get<FilaVentasCategoria[]>(`/reportes/ventas-categoria${rango(desde, hasta)}`),
  proyeccion: (ventanaDias = 30, horizonteDias = 30) =>
    api.get<FilaProyeccion[]>(
      `/reportes/proyeccion-stock?ventanaDias=${ventanaDias}&horizonteDias=${horizonteDias}`,
    ),
};
