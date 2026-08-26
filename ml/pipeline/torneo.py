"""P3.4 — Torneo de modelos: backtesting comparativo y selección por serie.

Igual que backtest.py (rolling origin, sin fuga temporal) pero:
  - orígenes ALINEADOS POR FECHA entre series (requisito del modelo global);
  - incluye los modelos P3 (ETS, SARIMA mensual, Croston SBA) y LightGBM global;
  - selecciona el ganador por serie (menor WAPE) y calcula el skill score
    vs el mejor baseline (criterio A propuesto en RP2-01 §6).

Salidas:
    eda/salidas/torneo_{gran}_{nivel}.csv    métricas por serie × modelo
    eda/salidas/seleccion_modelos.csv        ganador por serie (insumo de P4)
    eda/salidas/torneo_resumen.csv           M1/M2/M3 + skill por modelo
    (--escribir-bd) runs 'backtest-p3-torneo' en modelo_run/metrica_modelo

Uso:
    python pipeline/torneo.py [--escribir-bd] [-g semanal|mensual|ambas]
"""
import argparse
import logging
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import HORIZONTE, SALIDAS_DIR, get_engine
from pipeline import datos, modelo_global
from pipeline.metricas import mape, mape_acumulado, wape
from pipeline.modelos import BASELINES, REGISTRO

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("torneo")

CICLO = {"semanal": 52, "mensual": 12}
N_VALIDACION = {"semanal": 52, "mensual": 12}
PASO = {"semanal": 4, "mensual": 1}
MIN_TRAIN = 8


def fechas_origen(series: pd.DataFrame, gran: str) -> list:
    """Orígenes por fecha, comunes a todas las series (última fecha = 'hasta')."""
    fechas = sorted(series["periodo"].unique())
    h, n_val, paso = HORIZONTE[gran], N_VALIDACION[gran], PASO[gran]
    ini = max(0, len(fechas) - n_val)
    return [fechas[p] for p in range(ini, len(fechas) - h, paso)]


def _metricas(test: np.ndarray, pred: np.ndarray) -> tuple:
    return mape(test, pred), wape(test, pred), mape_acumulado(test, pred)


def evaluar_por_serie(series: pd.DataFrame, origenes: list, gran: str) -> list[dict]:
    """Modelos por-serie del REGISTRO sobre folds alineados por fecha."""
    h, ciclo = HORIZONTE[gran], CICLO[gran]
    res = []
    for sid, g in series.groupby("serie_id"):
        g = g.sort_values("periodo").reset_index(drop=True)
        pos = {p: i for i, p in enumerate(g["periodo"])}
        q = g["cantidad"].to_numpy(float)
        for nombre, fn in REGISTRO.items():
            filas = []
            for od in origenes:
                if od not in pos or pos[od] + 1 < MIN_TRAIN:
                    continue
                o = pos[od] + 1
                test = q[o:o + h]
                if len(test) < h:
                    continue
                pred = fn(q[:o], h, ciclo)
                if pred is None:
                    break                     # el modelo no aplica a esta serie
                filas.append(_metricas(test, pred))
            if len(filas) < 2:
                continue
            arr = np.array(filas, float)
            with np.errstate(invalid="ignore"), warnings.catch_warnings():
                warnings.simplefilter("ignore", category=RuntimeWarning)
                m = np.nanmean(arr, axis=0)
            res.append(dict(serie_id=sid, modelo=nombre, mape=m[0], wape=m[1],
                            mape_acum=m[2], n_folds=len(filas),
                            monto_total=g["monto_neto"].sum(),
                            nombre=g.iloc[-1].get("nombre", g.iloc[-1].get("categoria"))))
    return res


def evaluar_global(series: pd.DataFrame, origenes: list, gran: str) -> list[dict]:
    """LightGBM global: panel único, reentrenado por fold sin fuga temporal.

    El panel de entrenamiento usa orígenes de TODA la historia (no solo la
    ventana de validación): el modelo necesita ver patrones antiguos."""
    h, ciclo = HORIZONTE[gran], CICLO[gran]
    fechas = sorted(series["periodo"].unique())
    paso_train = 2 if gran == "semanal" else 1
    orig_train = fechas[MIN_TRAIN::paso_train]
    todos = sorted(set(orig_train) | set(origenes))
    panel = modelo_global.construir_panel(series, todos, h, ciclo, con_target=True)
    if panel.empty:
        return []
    umbral = 500 if gran == "semanal" else 300
    acum = {}
    for od in origenes:
        train = panel[panel["objetivo"] <= od]
        pred_rows = panel[panel["origen"] == od]
        if len(train) < umbral or pred_rows.empty:
            continue
        m = modelo_global.entrenar(train)
        pred = modelo_global.predecir(m, pred_rows)
        pred = pred.merge(pred_rows[["serie_id", "k", "y"]], on=["serie_id", "k"])
        for sid, gp in pred.groupby("serie_id"):
            gp = gp.sort_values("k")
            if len(gp) < h:
                continue
            acum.setdefault(sid, []).append(
                _metricas(gp["y"].to_numpy(float), gp["prediccion"].to_numpy(float)))
    info = series.groupby("serie_id").agg(
        monto_total=("monto_neto", "sum"), nombre=("nombre", "last")
        if "nombre" in series else ("categoria", "last"))
    res = []
    for sid, filas in acum.items():
        if len(filas) < 2:
            continue
        arr = np.array(filas, float)
        with np.errstate(invalid="ignore"), warnings.catch_warnings():
            warnings.simplefilter("ignore", category=RuntimeWarning)
            m = np.nanmean(arr, axis=0)
        res.append(dict(serie_id=sid, modelo="lgbm-global", mape=m[0], wape=m[1],
                        mape_acum=m[2], n_folds=len(filas),
                        monto_total=info.loc[sid, "monto_total"],
                        nombre=info.loc[sid, "nombre"]))
    return res


def clases_abc(df: pd.DataFrame) -> pd.Series:
    montos = (df.drop_duplicates("serie_id").set_index("serie_id")["monto_total"]
                .sort_values(ascending=False))
    acum = 100 * montos.cumsum() / montos.sum()
    return pd.cut(acum, [0, 80, 95, 100.001], labels=list("ABC"))


def seleccionar(todo: pd.DataFrame) -> pd.DataFrame:
    """Ganador por serie (menor WAPE) + skill vs mejor baseline de esa serie."""
    filas = []
    for (gran, nivel, sid), g in todo.groupby(["granularidad", "nivel", "serie_id"]):
        g = g.dropna(subset=["wape"])
        if g.empty:
            continue
        base = g[g.modelo.isin(BASELINES)]
        gana = g.loc[g["wape"].idxmin()]
        wb = base["wape"].min() if not base.empty else np.nan
        filas.append(dict(granularidad=gran, nivel=nivel, serie_id=sid,
                          nombre=gana["nombre"], modelo_ganador=gana["modelo"],
                          wape=round(gana["wape"], 1), wape_mejor_baseline=round(wb, 1),
                          skill_pct=round(100 * (1 - gana["wape"] / wb), 1) if wb and wb > 0 else np.nan,
                          mape_acum=round(gana["mape_acum"], 1),
                          monto_total=gana["monto_total"], n_folds=gana["n_folds"]))
    return pd.DataFrame(filas)


def resumen(todo: pd.DataFrame, sel: pd.DataFrame) -> pd.DataFrame:
    filas = []
    prod_sem = todo.query("nivel=='producto' and granularidad=='semanal'").copy()
    prod_sem["clase_abc"] = prod_sem["serie_id"].map(clases_abc(prod_sem))
    cat_men = todo.query("nivel=='categoria' and granularidad=='mensual'").copy()
    montos = cat_men.drop_duplicates("serie_id").sort_values("monto_total", ascending=False)
    princ = set(montos.loc[100 * montos["monto_total"].cumsum() / montos["monto_total"].sum() <= 95,
                           "serie_id"])
    cat_men = cat_men[cat_men["serie_id"].isin(princ)].dropna(subset=["mape"])

    modelos = list(todo["modelo"].unique()) + ["_torneo(mejor por serie)_"]
    for modelo in modelos:
        if modelo.startswith("_torneo"):
            a_sel = sel.query("nivel=='producto' and granularidad=='semanal'")
            ids_a = set(prod_sem.loc[prod_sem.clase_abc == "A", "serie_id"])
            a = a_sel[a_sel.serie_id.isin(ids_a)].rename(columns={"wape": "wape_v"})
            c_sel = sel.query("nivel=='categoria' and granularidad=='mensual'")
            c = cat_men.merge(c_sel[["serie_id", "modelo_ganador"]], on="serie_id")
            c = c[c.modelo == c.modelo_ganador]
            m1 = np.average(c["mape"], weights=c["monto_total"]) if len(c) else np.nan
            filas.append(dict(modelo=modelo, M1=round(m1, 1),
                              M2_mediana=round(a["mape_acum"].median(), 1),
                              M3_mediana=round(a["wape_v"].median(), 1),
                              skill_mediano_pct=round(a["skill_pct"].median(), 1),
                              n_series=len(a)))
            continue
        a = prod_sem[(prod_sem.modelo == modelo) & (prod_sem.clase_abc == "A")]
        c = cat_men[cat_men.modelo == modelo]
        m1 = np.average(c["mape"], weights=c["monto_total"]) if len(c) else np.nan
        filas.append(dict(modelo=modelo, M1=round(m1, 1),
                          M2_mediana=round(a["mape_acum"].median(), 1),
                          M3_mediana=round(a["wape"].median(), 1),
                          skill_mediano_pct=np.nan, n_series=a["serie_id"].nunique()))
    return pd.DataFrame(filas)


def escribir_bd(engine, sel: pd.DataFrame) -> None:
    for gran in sel["granularidad"].unique():
        sub = sel[sel.granularidad == gran]
        rid = datos.crear_run(engine, gran, HORIZONTE[gran], "backtest-p3-torneo", "p3")
        filas = [{
            "run_id": rid,
            "producto_id": int(x.serie_id) if x.nivel == "producto" else None,
            "categoria_id": int(x.serie_id) if x.nivel == "categoria" else None,
            "algoritmo_ganador": x.modelo_ganador,
            "mape": None if pd.isna(x.mape_acum) else float(x.mape_acum),
            "wape": None if pd.isna(x.wape) else float(x.wape),
            "n_periodos_validacion": int(x.n_folds),
        } for x in sub.itertuples()]
        with engine.begin() as cx:
            cx.execute(text("""
                INSERT INTO analytics.metrica_modelo
                    (run_id, producto_id, categoria_id, algoritmo_ganador,
                     mape, wape, n_periodos_validacion)
                VALUES (:run_id, :producto_id, :categoria_id, :algoritmo_ganador,
                        :mape, :wape, :n_periodos_validacion)"""), filas)
        datos.cerrar_run(engine, rid, "completado",
                         notas="torneo P3: mape=MAPE acumulado del ganador; skill en seleccion_modelos.csv")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--escribir-bd", action="store_true")
    ap.add_argument("-g", "--granularidad", choices=["semanal", "mensual", "ambas"],
                    default="ambas")
    args = ap.parse_args()

    eng = get_engine()
    datos.refrescar_vistas(eng)
    grans = ["semanal", "mensual"] if args.granularidad == "ambas" else [args.granularidad]
    partes = []
    for gran in grans:
        for nivel in ("producto", "categoria"):
            series = datos.leer_series(eng, nivel, gran)
            org = fechas_origen(series, gran)
            res = evaluar_por_serie(series, org, gran)
            if nivel == "producto":           # el global aprende entre productos
                res += evaluar_global(series, org, gran)
            df = pd.DataFrame(res)
            df["nivel"], df["granularidad"] = nivel, gran
            df.round(2).to_csv(SALIDAS_DIR / f"torneo_{gran}_{nivel}.csv", index=False)
            partes.append(df)
            log.info("[%s/%s] %d series evaluadas", gran, nivel, df["serie_id"].nunique())
    todo = pd.concat(partes, ignore_index=True)
    sel = seleccionar(todo)
    sel.to_csv(SALIDAS_DIR / "seleccion_modelos.csv", index=False)
    res = resumen(todo, sel)
    res.to_csv(SALIDAS_DIR / "torneo_resumen.csv", index=False)
    print("\n== Torneo P3 — M1/M2/M3 y skill vs mejor baseline ==")
    print(res.to_string(index=False))
    print("\nGanadores por serie:", sel["modelo_ganador"].value_counts().to_dict())

    if args.escribir_bd:
        escribir_bd(eng, sel)


if __name__ == "__main__":
    main()
