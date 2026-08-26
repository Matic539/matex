import { prisma } from '../../lib/prisma';

// Módulo predictivo (RF-22, RF-23, RF-24) — PDP-02 P5.
// El backend SOLO LEE lo que escribió el pipeline Python (reglas C4/C5):
// analytics.v_prediccion_vigente, v_cobertura_stock, metrica_modelo, modelo_run.

export interface FilaCobertura {
  productoId: number;
  codigo: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  demanda_prevista_4sem: number | null;
  demanda_prevista_12sem: number | null;
  fecha_alcanza_stock_minimo: Date | null;
  fecha_quiebre_estimada: Date | null;
  fecha_quiebre_pesimista: Date | null;
  dias_cobertura: number | null;
  algoritmo_ganador: string | null;
  mape_acum: number | null;
  confianza: string;
}

// RF-23/RF-27: tabla de cobertura — la vista ya contiene toda la lógica.
export async function cobertura(): Promise<FilaCobertura[]> {
  return prisma.$queryRaw<FilaCobertura[]>`
    SELECT producto_id                      AS "productoId",
           codigo, nombre, categoria,
           stock_actual::float8             AS stock_actual,
           stock_minimo::float8             AS stock_minimo,
           demanda_prevista_4sem::float8    AS demanda_prevista_4sem,
           demanda_prevista_12sem::float8   AS demanda_prevista_12sem,
           fecha_alcanza_stock_minimo,
           fecha_quiebre_estimada,
           fecha_quiebre_pesimista,
           dias_cobertura::int              AS dias_cobertura,
           algoritmo_ganador,
           mape_acum::float8                AS mape_acum,
           confianza
    FROM analytics.v_cobertura_stock
    ORDER BY fecha_quiebre_pesimista ASC NULLS LAST, nombre`;
}

export interface PuntoDemanda {
  periodo: Date;
  real: number | null;
  prevista: number | null;
  intervalo_inf: number | null;
  intervalo_sup: number | null;
}

// RF-22: demanda histórica + prevista (con banda) para una serie.
export async function demanda(
  nivel: 'producto' | 'categoria',
  id: number,
  granularidad: 'semanal' | 'mensual',
  historia: number,
): Promise<{ serie: PuntoDemanda[]; modelo: string | null; mape_acum: number | null }> {
  const unidad = granularidad === 'semanal' ? 'week' : 'month';

  const hist = await prisma.$queryRawUnsafe<{ periodo: Date; real: number }[]>(
    `SELECT date_trunc('${unidad}', t.fecha)::date AS periodo,
            SUM(f.cantidad)::float8 AS real
     FROM analytics.fact_ventas f
     JOIN analytics.dim_tiempo t ON t.fecha_id = f.fecha_id
     ${nivel === 'producto'
       ? 'WHERE f.producto_id = $1'
       : `JOIN analytics.dim_producto dp ON dp.producto_id = f.producto_id
          JOIN operacional.categoria c ON c.nombre = dp.categoria WHERE c.id = $1`}
     GROUP BY 1 ORDER BY 1 DESC LIMIT $2`,
    id,
    historia,
  );

  const col = nivel === 'producto' ? 'producto_id' : 'categoria_id';
  const pred = await prisma.$queryRawUnsafe<
    { periodo: Date; prevista: number; intervalo_inf: number | null; intervalo_sup: number | null }[]
  >(
    `SELECT periodo_inicio AS periodo,
            cantidad_prevista::float8 AS prevista,
            intervalo_inf::float8     AS intervalo_inf,
            intervalo_sup::float8     AS intervalo_sup
     FROM analytics.v_prediccion_vigente
     WHERE granularidad = $1 AND ${col} = $2
     ORDER BY periodo_inicio`,
    granularidad,
    id,
  );

  const metrica = await prisma.$queryRawUnsafe<
    { algoritmo_ganador: string; mape: number | null }[]
  >(
    `SELECT m.algoritmo_ganador, m.mape::float8 AS mape
     FROM analytics.metrica_modelo m
     JOIN analytics.modelo_run r ON r.id = m.run_id
     WHERE r.algoritmo = 'backtest-p3-torneo' AND r.granularidad = $1 AND m.${col} = $2
     ORDER BY r.ejecutado_en DESC LIMIT 1`,
    granularidad,
    id,
  );

  const serie: PuntoDemanda[] = [
    ...hist.reverse().map((h) => ({
      periodo: h.periodo, real: h.real,
      prevista: null, intervalo_inf: null, intervalo_sup: null,
    })),
    ...pred.map((p) => ({
      periodo: p.periodo, real: null,
      prevista: p.prevista, intervalo_inf: p.intervalo_inf, intervalo_sup: p.intervalo_sup,
    })),
  ];
  return {
    serie,
    modelo: metrica[0]?.algoritmo_ganador ?? null,
    mape_acum: metrica[0]?.mape ?? null,
  };
}

// RF-24: métricas del modelo (MAPE) + corrida vigente, por granularidad.
export async function metricas(granularidad: 'semanal' | 'mensual') {
  const [runVigente] = await prisma.$queryRaw<
    { id: number; ejecutado_en: Date; algoritmo: string; horizonte: number;
      mape_global: number | null; wape_global: number | null; notas: string | null }[]
  >`
    SELECT r.id, r.ejecutado_en, r.algoritmo, r.horizonte::int AS horizonte,
           r.mape_global::float8 AS mape_global, r.wape_global::float8 AS wape_global, r.notas
    FROM analytics.modelo_run r
    WHERE r.estado = 'completado' AND r.granularidad = ${granularidad}
      AND EXISTS (SELECT 1 FROM analytics.prediccion_demanda p WHERE p.run_id = r.id)
    ORDER BY r.ejecutado_en DESC LIMIT 1`;

  const porSerie = await prisma.$queryRaw<
    { nivel: string; id: number; nombre: string; algoritmo_ganador: string;
      mape: number | null; wape: number | null }[]
  >`
    SELECT CASE WHEN m.producto_id IS NOT NULL THEN 'producto' ELSE 'categoria' END AS nivel,
           COALESCE(m.producto_id, m.categoria_id)                                  AS id,
           COALESCE(dp.nombre, c.nombre)                                            AS nombre,
           m.algoritmo_ganador,
           m.mape::float8 AS mape,
           m.wape::float8 AS wape
    FROM analytics.metrica_modelo m
    JOIN analytics.modelo_run r ON r.id = m.run_id
    LEFT JOIN analytics.dim_producto dp ON dp.producto_id = m.producto_id
    LEFT JOIN operacional.categoria c ON c.id = m.categoria_id
    WHERE r.algoritmo = 'backtest-p3-torneo' AND r.granularidad = ${granularidad}
      AND r.ejecutado_en = (SELECT MAX(ejecutado_en) FROM analytics.modelo_run
                            WHERE algoritmo = 'backtest-p3-torneo' AND granularidad = ${granularidad})
    ORDER BY nivel, nombre`;

  return { runVigente: runVigente ?? null, porSerie };
}
