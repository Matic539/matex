"""Capa de acceso a datos del pipeline (P1.3).

Lecturas desde analytics.* y escrituras SOLO en las tablas de predicción
(reglas C1/C5 de PDP-02). La escritura es idempotente: cada corrida crea su
propio run_id y borra/reescribe únicamente sus filas.
"""
import logging
from datetime import timedelta

import pandas as pd
from sqlalchemy import text

log = logging.getLogger("pipeline")

# Series por producto o categoría con período ya truncado en SQL.
# date_trunc('week') = lunes ISO (coherente con dim_tiempo.semana y el EDA).
_SQL_SERIES = {
    "producto": """
        SELECT f.producto_id AS serie_id, p.codigo, p.nombre, p.categoria,
               date_trunc('{unidad}', t.fecha)::date AS periodo,
               SUM(f.cantidad)::float AS cantidad,
               SUM(f.monto_neto)::float AS monto_neto
        FROM analytics.fact_ventas f
        JOIN analytics.dim_tiempo   t ON t.fecha_id = f.fecha_id
        JOIN analytics.dim_producto p ON p.producto_id = f.producto_id
        GROUP BY 1, 2, 3, 4, 5
        ORDER BY 1, 5""",
    "categoria": """
        SELECT c.id AS serie_id, c.nombre AS categoria,
               date_trunc('{unidad}', t.fecha)::date AS periodo,
               SUM(f.cantidad)::float AS cantidad,
               SUM(f.monto_neto)::float AS monto_neto
        FROM analytics.fact_ventas f
        JOIN analytics.dim_tiempo   t ON t.fecha_id = f.fecha_id
        JOIN analytics.dim_producto p ON p.producto_id = f.producto_id
        JOIN operacional.categoria  c ON c.nombre = p.categoria
        GROUP BY 1, 2, 3
        ORDER BY 1, 3""",
}


def refrescar_vistas(engine) -> None:
    """Paso 1 del pipeline SIEMPRE (regla C6: nunca en paralelo)."""
    with engine.begin() as cx:
        for v in ("dim_producto", "fact_ventas", "fact_stock_diario"):
            cx.execute(text(f"REFRESH MATERIALIZED VIEW analytics.{v}"))
    log.info("Vistas materializadas refrescadas")


def leer_series(engine, nivel: str, granularidad: str) -> pd.DataFrame:
    """Series completas (períodos sin venta = 0) por producto o categoría.

    Excluye el período final si está incompleto (la última semana/mes con
    datos parciales sesgaría el entrenamiento y la validación)."""
    from config import FECHA_CORTE
    unidad = "week" if granularidad == "semanal" else "month"
    df = pd.read_sql(_SQL_SERIES[nivel].format(unidad=unidad), engine,
                     parse_dates=["periodo"])
    freq = "W-MON" if granularidad == "semanal" else "MS"
    max_fecha = pd.read_sql(
        "SELECT MAX(t.fecha) AS f FROM analytics.fact_ventas v "
        "JOIN analytics.dim_tiempo t ON t.fecha_id = v.fecha_id", engine)["f"].iloc[0]
    max_fecha = pd.Timestamp(max_fecha)
    if FECHA_CORTE:  # ventana post-migración incompleta: no entrenar con ella (PDM-01)
        corte = pd.Timestamp(FECHA_CORTE)
        if corte < max_fecha:
            df = df[df["periodo"] <= corte]
            max_fecha = corte
            log.info("Fecha de corte aplicada: se entrena solo hasta %s", corte.date())
    fin_ultimo = (df["periodo"].max() + (pd.Timedelta(days=6) if granularidad == "semanal"
                                         else pd.offsets.MonthEnd(0)))
    if fin_ultimo > max_fecha:  # período en curso, datos parciales
        df = df[df["periodo"] < df["periodo"].max()]
        log.info("Período final incompleto excluido (%s > última venta %s)",
                 fin_ultimo.date(), max_fecha.date())
    hasta = df["periodo"].max()
    piezas = []
    for sid, g in df.groupby("serie_id"):
        idx = pd.date_range(g["periodo"].min(), hasta, freq=freq)
        s = (g.set_index("periodo").reindex(idx)
              .rename_axis("periodo").reset_index())
        s[["cantidad", "monto_neto"]] = s[["cantidad", "monto_neto"]].fillna(0.0)
        s = s.ffill()  # completa identificadores
        piezas.append(s)
    out = pd.concat(piezas, ignore_index=True)
    log.info("Series %s/%s: %d series, %d filas", nivel, granularidad,
             out["serie_id"].nunique(), len(out))
    return out


def crear_run(engine, granularidad: str, horizonte: int,
              algoritmo: str, version_codigo: str) -> int:
    with engine.begin() as cx:
        rid = cx.execute(text("""
            INSERT INTO analytics.modelo_run (granularidad, horizonte, algoritmo, version_codigo)
            VALUES (:g, :h, :a, :v) RETURNING id"""),
            dict(g=granularidad, h=horizonte, a=algoritmo, v=version_codigo)).scalar_one()
    log.info("Run %d creado (%s, horizonte %d, %s)", rid, granularidad, horizonte, algoritmo)
    return rid


def cerrar_run(engine, run_id: int, estado: str, mape=None, wape=None, notas=None) -> None:
    with engine.begin() as cx:
        cx.execute(text("""
            UPDATE analytics.modelo_run
            SET estado=:e, mape_global=:m, wape_global=:w, notas=:n
            WHERE id=:id"""),
            dict(e=estado, m=mape, w=wape, n=notas, id=run_id))
    log.info("Run %d cerrado: %s", run_id, estado)


def escribir_predicciones(engine, run_id: int, df: pd.DataFrame,
                          nivel: str, granularidad: str) -> int:
    """df: serie_id, periodo, cantidad_prevista[, intervalo_inf, intervalo_sup]."""
    col = "producto_id" if nivel == "producto" else "categoria_id"
    dias = 6 if granularidad == "semanal" else None
    filas = []
    for _, r in df.iterrows():
        ini = pd.Timestamp(r["periodo"])
        fin = ini + timedelta(days=dias) if dias else ini + pd.offsets.MonthEnd(0)
        filas.append({
            "run_id": run_id, col: int(r["serie_id"]),
            "periodo_inicio": ini.date(), "periodo_fin": fin.date(),
            "cantidad_prevista": max(0.0, float(r["cantidad_prevista"])),
            "intervalo_inf": r.get("intervalo_inf"), "intervalo_sup": r.get("intervalo_sup"),
        })
    with engine.begin() as cx:
        cx.execute(text(f"""DELETE FROM analytics.prediccion_demanda
                            WHERE run_id=:r AND {col} IS NOT NULL"""), dict(r=run_id))
        cx.execute(text(f"""
            INSERT INTO analytics.prediccion_demanda
                (run_id, {col}, periodo_inicio, periodo_fin,
                 cantidad_prevista, intervalo_inf, intervalo_sup)
            VALUES (:run_id, :{col}, :periodo_inicio, :periodo_fin,
                    :cantidad_prevista, :intervalo_inf, :intervalo_sup)"""), filas)
    log.info("Run %d: %d predicciones escritas (%s)", run_id, len(filas), nivel)
    return len(filas)
