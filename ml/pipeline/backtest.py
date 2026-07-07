"""P2 — Backtesting con origen rodante (rolling origin) sobre analytics.fact_ventas.

Para cada serie (producto/categoría × semanal/mensual) y cada modelo del
REGISTRO, entrena con la historia hasta cada origen y evalúa el horizonte
siguiente. Sin fuga temporal: el modelo solo ve datos anteriores al origen.

Métricas por serie (promedio entre folds): MAPE, WAPE (M3), MAPE acumulado (M2).
Resumen global: M1 (MAPE mensual por categoría ponderado por monto) y
M2/M3 sobre productos clase A (EDA-01 §5).

Salidas:
    eda/salidas/backtest_{gran}_{nivel}.csv     detalle por serie × modelo
    eda/salidas/backtest_resumen.csv            M1/M2/M3 por modelo
    (--escribir-bd) analytics.modelo_run + metrica_modelo con el mejor
    baseline por serie (algoritmo 'backtest-p2-baselines')

Uso:
    python pipeline/backtest.py                 # ambas granularidades, solo CSV
    python pipeline/backtest.py --escribir-bd
"""
import argparse
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import HORIZONTE, SALIDAS_DIR, get_engine
from pipeline import datos
from pipeline.metricas import mape, mape_acumulado, wape
from pipeline.modelos import REGISTRO

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("backtest")

CICLO = {"semanal": 52, "mensual": 12}
N_VALIDACION = {"semanal": 52, "mensual": 12}   # períodos reservados para validar
PASO = {"semanal": 4, "mensual": 1}             # desplazamiento entre orígenes
MIN_HISTORIA = 2                                 # mínimo de folds para reportar


def origenes(n: int, horizonte: int, n_val: int, paso: int) -> list[int]:
    """Índices de corte train/test dentro de la serie (rolling origin)."""
    ini = max(horizonte, n - n_val)              # primer origen: inicio de la validación
    return [o for o in range(ini, n - horizonte + 1, paso)]


def evaluar_serie(q: np.ndarray, gran: str) -> list[dict]:
    """Corre todos los modelos sobre todos los folds de una serie."""
    h, ciclo = HORIZONTE[gran], CICLO[gran]
    outs = []
    for nombre, fn in REGISTRO.items():
        filas = []
        for o in origenes(len(q), h, N_VALIDACION[gran], PASO[gran]):
            train, test = q[:o], q[o:o + h]
            pred = fn(train, len(test), ciclo)
            filas.append((mape(test, pred), wape(test, pred), mape_acumulado(test, pred)))
        if len(filas) < MIN_HISTORIA:
            continue
        arr = np.array(filas, dtype=float)
        with np.errstate(invalid="ignore"):
            m = np.nanmean(arr, axis=0)
        outs.append({"modelo": nombre, "mape": m[0], "wape": m[1],
                     "mape_acum": m[2], "n_folds": len(filas)})
    return outs


def correr_nivel(engine, nivel: str, gran: str) -> pd.DataFrame:
    series = datos.leer_series(engine, nivel, gran)
    res = []
    for sid, g in series.groupby("serie_id"):
        g = g.sort_values("periodo")
        q = g["cantidad"].to_numpy(float)
        for r in evaluar_serie(q, gran):
            r.update(serie_id=sid, nivel=nivel, granularidad=gran,
                     monto_total=g["monto_neto"].sum(),
                     nombre=g.iloc[-1].get("nombre", g.iloc[-1].get("categoria")))
            res.append(r)
    return pd.DataFrame(res)


def clases_abc(df_prod: pd.DataFrame) -> pd.Series:
    """ABC por monto (80/95) sobre los resultados de nivel producto."""
    montos = (df_prod.drop_duplicates("serie_id")
                     .set_index("serie_id")["monto_total"]
                     .sort_values(ascending=False))
    acum = 100 * montos.cumsum() / montos.sum()
    return pd.cut(acum, [0, 80, 95, 100.001], labels=list("ABC"))


def resumen_metricas(todo: pd.DataFrame) -> pd.DataFrame:
    """M1, M2, M3 por modelo (definiciones en EDA-01 §5).

    M1 se calcula solo sobre las categorías principales (las que acumulan
    95% del monto), excluyendo las de cola larga (Maderas, Aislación,
    Accesorios) que EDA-01 deja fuera del alcance del MAPE. Para M2/M3 se
    reporta media y mediana (la mediana es robusta a series moribundas)."""
    filas = []
    prod_sem = todo.query("nivel=='producto' and granularidad=='semanal'").copy()
    abc = clases_abc(prod_sem)
    prod_sem["clase_abc"] = prod_sem["serie_id"].map(abc)

    cat_men = todo.query("nivel=='categoria' and granularidad=='mensual'").copy()
    montos = (cat_men.drop_duplicates("serie_id")
                     .sort_values("monto_total", ascending=False))
    acum = 100 * montos["monto_total"].cumsum() / montos["monto_total"].sum()
    principales = set(montos.loc[acum <= 95.0, "serie_id"])
    cat_men = cat_men[cat_men["serie_id"].isin(principales)].dropna(subset=["mape"])

    for modelo in todo["modelo"].unique():
        a = prod_sem[(prod_sem.modelo == modelo) & (prod_sem.clase_abc == "A")]
        c = cat_men[cat_men.modelo == modelo]
        m1 = np.average(c["mape"], weights=c["monto_total"]) if len(c) else np.nan
        filas.append({
            "modelo": modelo,
            "M1_mape_mensual_categoria_pond": round(m1, 1),
            "M2_mape_acum_12sem_claseA_media": round(a["mape_acum"].mean(), 1),
            "M2_mediana": round(a["mape_acum"].median(), 1),
            "M3_wape_semanal_claseA_media": round(a["wape"].mean(), 1),
            "M3_mediana": round(a["wape"].median(), 1),
            "n_categorias_M1": c["serie_id"].nunique(),
            "n_productos_A": a["serie_id"].nunique(),
        })
    return pd.DataFrame(filas)


def escribir_bd(engine, todo: pd.DataFrame, resumen: pd.DataFrame) -> None:
    """Mejor baseline por serie → metrica_modelo, bajo un run de auditoría."""
    for gran in todo["granularidad"].unique():
        sub = todo[todo.granularidad == gran]
        idx = sub.groupby(["nivel", "serie_id"])["wape"].idxmin().dropna()
        mejor = sub.loc[idx]  # series sin WAPE computable (demanda 0 en validación) quedan fuera
        r = resumen.set_index("modelo")
        rid = datos.crear_run(engine, gran, HORIZONTE[gran],
                              "backtest-p2-baselines", "p2")
        filas = [{
            "run_id": rid,
            "producto_id": int(x.serie_id) if x.nivel == "producto" else None,
            "categoria_id": int(x.serie_id) if x.nivel == "categoria" else None,
            "algoritmo_ganador": x.modelo,
            "mape": None if np.isnan(x.mape) else round(x.mape, 2),
            "wape": None if np.isnan(x.wape) else round(x.wape, 2),
            "n_periodos_validacion": int(x.n_folds),
        } for x in mejor.itertuples()]
        with engine.begin() as cx:
            cx.execute(text("""
                INSERT INTO analytics.metrica_modelo
                    (run_id, producto_id, categoria_id, algoritmo_ganador,
                     mape, wape, n_periodos_validacion)
                VALUES (:run_id, :producto_id, :categoria_id, :algoritmo_ganador,
                        :mape, :wape, :n_periodos_validacion)"""), filas)
        notas = ("backtest baselines P2; M1=%s M2(mediana)=%s (mejor modelo por WAPE por serie)"
                 % (r["M1_mape_mensual_categoria_pond"].min(),
                    r["M2_mediana"].min()))
        datos.cerrar_run(engine, rid, "completado", notas=notas)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--escribir-bd", action="store_true",
                    help="persistir mejor baseline por serie en metrica_modelo")
    args = ap.parse_args()

    eng = get_engine()
    datos.refrescar_vistas(eng)
    partes = []
    for gran in ("semanal", "mensual"):
        for nivel in ("producto", "categoria"):
            df = correr_nivel(eng, nivel, gran)
            df.round(2).to_csv(SALIDAS_DIR / f"backtest_{gran}_{nivel}.csv", index=False)
            partes.append(df)
    todo = pd.concat(partes, ignore_index=True)
    resumen = resumen_metricas(todo)
    resumen.to_csv(SALIDAS_DIR / "backtest_resumen.csv", index=False)
    print("\n== Resumen M1/M2/M3 por modelo (umbral RNF-09: M1 < 15) ==")
    print(resumen.to_string(index=False))

    if args.escribir_bd:
        escribir_bd(eng, todo, resumen)


if __name__ == "__main__":
    main()
