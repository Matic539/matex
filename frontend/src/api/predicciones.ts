import { api } from './client';

export type Confianza = 'alta' | 'media' | 'baja' | 'sin_modelo';
export type Granularidad = 'semanal' | 'mensual';

export interface FilaCobertura {
  productoId: number;
  codigo: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  demanda_prevista_4sem: number | null;
  demanda_prevista_12sem: number | null;
  fecha_alcanza_stock_minimo: string | null;
  fecha_quiebre_estimada: string | null;
  fecha_quiebre_pesimista: string | null;
  dias_cobertura: number | null;
  algoritmo_ganador: string | null;
  mape_acum: number | null;
  confianza: Confianza;
}

export interface PuntoDemanda {
  periodo: string;
  real: number | null;
  prevista: number | null;
  intervalo_inf: number | null;
  intervalo_sup: number | null;
}

export interface DemandaSerie {
  serie: PuntoDemanda[];
  modelo: string | null;
  mape_acum: number | null;
}

export interface MetricasModelo {
  runVigente: {
    id: number;
    ejecutado_en: string;
    algoritmo: string;
    horizonte: number;
    mape_global: number | null;
    wape_global: number | null;
    notas: string | null;
  } | null;
  porSerie: {
    nivel: 'producto' | 'categoria';
    id: number;
    nombre: string;
    algoritmo_ganador: string;
    mape: number | null;
    wape: number | null;
  }[];
}

export const prediccionesApi = {
  cobertura: () => api.get<FilaCobertura[]>('/predicciones/cobertura'),
  demanda: (nivel: 'producto' | 'categoria', id: number, granularidad: Granularidad, historia = 26) =>
    api.get<DemandaSerie>(
      `/predicciones/demanda?nivel=${nivel}&id=${id}&granularidad=${granularidad}&historia=${historia}`,
    ),
  metricas: (granularidad: Granularidad) =>
    api.get<MetricasModelo>(`/predicciones/metricas?granularidad=${granularidad}`),
};
