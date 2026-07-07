"""P0.1 — Series de demanda semanales y mensuales por producto y categoría.

Lee analytics.fact_ventas + dim_tiempo + dim_producto y construye series
completas (períodos sin venta = 0) desde la primera venta de cada serie
hasta la última fecha con ventas en la BD.

Salidas (ml/eda/salidas/):
    series_{semanal|mensual}_producto.csv   columnas: producto_id, codigo, nombre,
                                            categoria, periodo, cantidad, monto_neto
    series_{semanal|mensual}_categoria.csv  columnas: categoria, periodo, cantidad, monto_neto

Uso:  python p01_series.py
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import SALIDAS_DIR, get_engine

SQL = """
SELECT f.fecha_id, t.fecha, t.anio, t.mes, t.semana,
       f.producto_id, p.codigo, p.nombre, p.categoria,
       f.cantidad::float AS cantidad, f.monto_neto::float AS monto_neto
FROM analytics.fact_ventas f
JOIN analytics.dim_tiempo   t ON t.fecha_id = f.fecha_id
JOIN analytics.dim_producto p ON p.producto_id = f.producto_id
"""


def periodo_col(df: pd.DataFrame, gran: str) -> pd.Series:
    """Etiqueta de período: lunes de la semana ISO, o primer día del mes."""
    fechas = pd.to_datetime(df["fecha"])
    if gran == "semanal":
        return fechas.dt.to_period("W-SUN").dt.start_time.dt.date
    return fechas.dt.to_period("M").dt.start_time.dt.date


def completar(serie: pd.DataFrame, gran: str, hasta) -> pd.DataFrame:
    """Rellena con 0 los períodos sin venta entre la primera venta y `hasta`."""
    freq = "W-MON" if gran == "semanal" else "MS"
    idx = pd.date_range(serie["periodo"].min(), hasta, freq=freq).date
    return (
        serie.set_index("periodo").reindex(idx, fill_value=0.0)
        .rename_axis("periodo").reset_index()
    )


def main() -> None:
    eng = get_engine()
    base = pd.read_sql(SQL, eng)
    print(f"fact_ventas: {len(base)} filas · {base['producto_id'].nunique()} productos")

    for gran in ("semanal", "mensual"):
        base["periodo"] = periodo_col(base, gran)
        hasta = base["periodo"].max()

        # --- nivel producto -------------------------------------------------
        prod = (base.groupby(["producto_id", "codigo", "nombre", "categoria", "periodo"])
                    .agg(cantidad=("cantidad", "sum"), monto_neto=("monto_neto", "sum"))
                    .reset_index())
        piezas = []
        for (pid, cod, nom, cat), g in prod.groupby(["producto_id", "codigo", "nombre", "categoria"]):
            s = completar(g[["periodo", "cantidad", "monto_neto"]], gran, hasta)
            s[["producto_id", "codigo", "nombre", "categoria"]] = pid, cod, nom, cat
            piezas.append(s)
        out_p = pd.concat(piezas, ignore_index=True)
        out_p.to_csv(SALIDAS_DIR / f"series_{gran}_producto.csv", index=False)

        # --- nivel categoría ------------------------------------------------
        cat = (base.groupby(["categoria", "periodo"])
                   .agg(cantidad=("cantidad", "sum"), monto_neto=("monto_neto", "sum"))
                   .reset_index())
        piezas = []
        for c, g in cat.groupby("categoria"):
            s = completar(g[["periodo", "cantidad", "monto_neto"]], gran, hasta)
            s["categoria"] = c
            piezas.append(s)
        out_c = pd.concat(piezas, ignore_index=True)
        out_c.to_csv(SALIDAS_DIR / f"series_{gran}_categoria.csv", index=False)

        print(f"[{gran}] producto: {len(out_p)} filas · categoría: {len(out_c)} filas "
              f"({out_c['periodo'].nunique()} períodos, hasta {hasta})")


if __name__ == "__main__":
    main()
