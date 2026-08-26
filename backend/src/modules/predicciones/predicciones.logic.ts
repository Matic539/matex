// Lógica pura del módulo predictivo (testeable sin BD) — PDP-02 P5.
// La política de presentación viene de RP4-01 §3: rangos + confianza,
// y la reposición se decide con la fecha PESIMISTA vs el lead time.

export type Confianza = 'alta' | 'media' | 'baja' | 'sin_modelo';

/** Clasificación de confianza según MAPE acumulado del ganador (RP3-01 §3). */
export function nivelConfianza(mapeAcum: number | null | undefined): Confianza {
  if (mapeAcum == null || Number.isNaN(mapeAcum)) return 'sin_modelo';
  if (mapeAcum <= 40) return 'alta';
  if (mapeAcum <= 80) return 'media';
  return 'baja';
}

/**
 * Sugerencia de reposición (RF-23): lo necesario para cubrir la demanda
 * prevista del lead time sin perforar el stock mínimo.
 */
export function sugerenciaReposicion(params: {
  stockActual: number;
  stockMinimo: number;
  demandaPrevistaLeadTime: number;
}): number {
  const { stockActual, stockMinimo, demandaPrevistaLeadTime } = params;
  return Math.max(0, Math.ceil(demandaPrevistaLeadTime + stockMinimo - stockActual));
}

/**
 * ¿Debe alertarse reposición? Regla RP4-01 §3: con confianza utilizable se
 * usa la fecha PESIMISTA de quiebre vs el lead time; con confianza baja o
 * sin modelo, la alerta cae a la regla clásica de stock mínimo.
 */
export function debeReponer(params: {
  confianza: Confianza;
  fechaQuiebrePesimista: Date | null;
  leadTimeDias: number;
  stockActual: number;
  stockMinimo: number;
  hoy?: Date;
}): boolean {
  const { confianza, fechaQuiebrePesimista, leadTimeDias, stockActual, stockMinimo } = params;
  if (confianza === 'baja' || confianza === 'sin_modelo') {
    return stockActual <= stockMinimo;
  }
  if (!fechaQuiebrePesimista) return false; // el stock cubre todo el horizonte
  const hoy = params.hoy ?? new Date();
  const diasHastaQuiebre = (fechaQuiebrePesimista.getTime() - hoy.getTime()) / 86_400_000;
  return diasHastaQuiebre <= leadTimeDias;
}

/** Fuente de la proyección RF-27: modelo si hay predicción vigente, si no promedio móvil. */
export function decidirFuente(hayPrediccionVigente: boolean): 'modelo' | 'promedio_movil' {
  return hayPrediccionVigente ? 'modelo' : 'promedio_movil';
}
