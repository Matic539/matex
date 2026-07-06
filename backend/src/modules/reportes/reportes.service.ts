import { prisma } from '../../lib/prisma';
import { aFechaId, rangoPorDefecto } from './reportes.schemas';

// Los reportes consumen el esquema `analytics` (modelo estrella, DBD-01 §6).
// Las vistas materializadas no son modelos Prisma: se consultan con $queryRaw
// (todos los numéricos se castean en SQL a float8/int para serializar limpio).

// ── 4.1 Refresh de vistas materializadas ──────────────────────
// Última actualización en memoria (suficiente para el prototipo; en
// producción se registraría en una tabla o se usaría un scheduler).
let ultimaActualizacion: Date | null = null;

export async function refrescar() {
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW analytics.dim_producto');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW analytics.fact_ventas');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW analytics.fact_stock_diario');
  ultimaActualizacion = new Date();
  return { ultimaActualizacion };
}

export const getUltimaActualizacion = () => ultimaActualizacion;

// ── 4.5 Dashboard (RF-28) ─────────────────────────────────────
export async function dashboard(dias: number) {
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - (dias - 1) * 24 * 60 * 60 * 1000);
  const desdeId = aFechaId(desde);
  const hastaId = aFechaId(hasta);

  const [kpis] = await prisma.$queryRaw<
    { monto: number; unidades: number; transacciones: number }[]
  >`
    SELECT COALESCE(SUM(monto_bruto), 0)::float8    AS monto,
           COALESCE(SUM(cantidad), 0)::float8       AS unidades,
           COALESCE(SUM(n_transacciones), 0)::int   AS transacciones
    FROM analytics.fact_ventas
    WHERE fecha_id BETWEEN ${desdeId} AND ${hastaId}`;

  const serieDiaria = await prisma.$queryRaw<{ fecha: Date; monto: number }[]>`
    SELECT dt.fecha,
           COALESCE(SUM(fv.monto_bruto), 0)::float8 AS monto
    FROM analytics.dim_tiempo dt
    LEFT JOIN analytics.fact_ventas fv ON fv.fecha_id = dt.fecha_id
    WHERE dt.fecha_id BETWEEN ${desdeId} AND ${hastaId}
    GROUP BY dt.fecha
    ORDER BY dt.fecha`;

  const topProductos = await prisma.$queryRaw<
    { nombre: string; monto: number; unidades: number }[]
  >`
    SELECT dp.nombre,
           SUM(fv.monto_bruto)::float8 AS monto,
           SUM(fv.cantidad)::float8    AS unidades
    FROM analytics.fact_ventas fv
    JOIN analytics.dim_producto dp ON dp.producto_id = fv.producto_id
    WHERE fv.fecha_id BETWEEN ${desdeId} AND ${hastaId}
    GROUP BY dp.nombre
    ORDER BY monto DESC
    LIMIT 5`;

  const porCategoria = await prisma.$queryRaw<{ categoria: string; monto: number }[]>`
    SELECT dp.categoria,
           SUM(fv.monto_bruto)::float8 AS monto
    FROM analytics.fact_ventas fv
    JOIN analytics.dim_producto dp ON dp.producto_id = fv.producto_id
    WHERE fv.fecha_id BETWEEN ${desdeId} AND ${hastaId}
    GROUP BY dp.categoria
    ORDER BY monto DESC`;

  // Alertas en vivo desde operacional (no dependen del refresh)
  const [alertas] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM operacional.v_stock_actual
    WHERE stock_actual < stock_minimo`;

  return {
    periodoDias: dias,
    kpis: { ...kpis, productosBajoMinimo: alertas?.n ?? 0 },
    serieDiaria,
    topProductos,
    porCategoria,
    ultimaActualizacion,
  };
}

// ── 4.2 Rotación de inventario (RF-25) ────────────────────────
export async function rotacion(desde?: Date, hasta?: Date) {
  const { desdeId, hastaId } = rangoPorDefecto(desde, hasta);

  return prisma.$queryRaw<
    {
      productoId: number;
      codigo: string;
      nombre: string;
      categoria: string;
      unidades_vendidas: number;
      monto_vendido: number;
      stock_promedio: number | null;
      indice_rotacion: number | null;
    }[]
  >`
    WITH ventas AS (
      SELECT producto_id,
             SUM(cantidad)    AS unidades,
             SUM(monto_bruto) AS monto
      FROM analytics.fact_ventas
      WHERE fecha_id BETWEEN ${desdeId} AND ${hastaId}
      GROUP BY producto_id
    ), stock_prom AS (
      SELECT producto_id, AVG(stock_fin_dia) AS promedio
      FROM analytics.fact_stock_diario
      WHERE fecha_id BETWEEN ${desdeId} AND ${hastaId}
      GROUP BY producto_id
    )
    SELECT dp.producto_id                         AS "productoId",
           dp.codigo,
           dp.nombre,
           dp.categoria,
           COALESCE(v.unidades, 0)::float8        AS unidades_vendidas,
           COALESCE(v.monto, 0)::float8           AS monto_vendido,
           sp.promedio::float8                    AS stock_promedio,
           CASE WHEN COALESCE(sp.promedio, 0) > 0
                THEN (COALESCE(v.unidades, 0) / sp.promedio)::float8
                ELSE NULL END                     AS indice_rotacion
    FROM analytics.dim_producto dp
    LEFT JOIN ventas v ON v.producto_id = dp.producto_id
    LEFT JOIN stock_prom sp ON sp.producto_id = dp.producto_id
    ORDER BY unidades_vendidas DESC, dp.nombre
    LIMIT 200`;
}

// ── 4.3 Ventas por categoría y período (RF-26) ────────────────
export async function ventasPorCategoria(desde?: Date, hasta?: Date) {
  const { desdeId, hastaId } = rangoPorDefecto(desde, hasta, 365);

  return prisma.$queryRaw<
    {
      categoria: string;
      anio: number;
      mes: number;
      monto: number;
      unidades: number;
      transacciones: number;
    }[]
  >`
    SELECT dp.categoria,
           dt.anio::int                       AS anio,
           dt.mes::int                        AS mes,
           SUM(fv.monto_bruto)::float8        AS monto,
           SUM(fv.cantidad)::float8           AS unidades,
           SUM(fv.n_transacciones)::int       AS transacciones
    FROM analytics.fact_ventas fv
    JOIN analytics.dim_producto dp ON dp.producto_id = fv.producto_id
    JOIN analytics.dim_tiempo dt   ON dt.fecha_id = fv.fecha_id
    WHERE fv.fecha_id BETWEEN ${desdeId} AND ${hastaId}
    GROUP BY dp.categoria, dt.anio, dt.mes
    ORDER BY dt.anio, dt.mes, monto DESC`;
}

// ── 4.4 Proyección de stock (RF-27, provisional sin ML) ───────
// Promedio móvil de ventas de los últimos `ventanaDias` → días de
// cobertura y sugerencia de reposición. Este endpoint define el contrato
// que luego implementará el módulo predictivo (RF-22/23) sin tocar la UI.
export async function proyeccionStock(ventanaDias: number, horizonteDias: number) {
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - (ventanaDias - 1) * 24 * 60 * 60 * 1000);
  const desdeId = aFechaId(desde);
  const hastaId = aFechaId(hasta);

  return prisma.$queryRaw<
    {
      productoId: number;
      codigo: string;
      nombre: string;
      categoria: string;
      stock_actual: number;
      stock_minimo: number;
      venta_diaria_promedio: number;
      dias_cobertura: number | null;
      sugerencia_reposicion: number;
    }[]
  >`
    WITH ventas_ventana AS (
      SELECT producto_id, SUM(cantidad) AS unidades
      FROM analytics.fact_ventas
      WHERE fecha_id BETWEEN ${desdeId} AND ${hastaId}
      GROUP BY producto_id
    )
    SELECT sa.producto_id                                   AS "productoId",
           sa.codigo,
           sa.nombre,
           dp.categoria,
           sa.stock_actual::float8                          AS stock_actual,
           sa.stock_minimo::float8                          AS stock_minimo,
           (COALESCE(vv.unidades, 0) / ${ventanaDias}::float8)::float8 AS venta_diaria_promedio,
           CASE WHEN COALESCE(vv.unidades, 0) > 0
                THEN (sa.stock_actual / (vv.unidades / ${ventanaDias}::float8))::float8
                ELSE NULL END                               AS dias_cobertura,
           GREATEST(
             0,
             CEIL((COALESCE(vv.unidades, 0) / ${ventanaDias}::float8) * ${horizonteDias}::float8
                  - sa.stock_actual)
           )::float8                                        AS sugerencia_reposicion
    FROM operacional.v_stock_actual sa
    JOIN analytics.dim_producto dp ON dp.producto_id = sa.producto_id
    LEFT JOIN ventas_ventana vv ON vv.producto_id = sa.producto_id
    ORDER BY dias_cobertura ASC NULLS LAST, sa.nombre
    LIMIT 200`;
}
