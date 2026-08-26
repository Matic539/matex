"""P3.3 — Modelo global LightGBM multi-paso directo.

Un solo modelo entrenado con TODAS las series de producto a la vez
(estrategia global): aprende patrones compartidos (estacionalidad del rubro,
efecto feriados, comportamiento por categoría) que una serie individual de
~200 puntos no puede sostener.

Estrategia multi-paso DIRECTA: cada fila del panel es (serie, origen, k pasos
adelante) con features calculadas SOLO con información disponible en el
origen (sin fuga temporal). `k` es una feature, así un único modelo predice
todo el horizonte.

Features por fila:
    lag_1, lag_2, lag_3, lag_ciclo      demanda en el origen
    mm_4, mm_8                          medias móviles al origen
    pct_ceros_12                        intermitencia reciente
    k                                   pasos adelante (1..horizonte)
    periodo_ciclo                       semana/mes del año del período objetivo
    categoria_id                        (categórica)
"""
import logging

import numpy as np
import pandas as pd

log = logging.getLogger("modelo_global")

PARAMS = dict(objective="regression_l1", n_estimators=300, learning_rate=0.05,
              num_leaves=31, min_child_samples=30, subsample=0.9,
              colsample_bytree=0.8, verbose=-1)


def _features_origen(q: np.ndarray, ciclo: int) -> dict:
    """Features de la serie calculadas en el origen (usa solo q[:origen])."""
    return {
        "lag_1": q[-1] if len(q) >= 1 else 0.0,
        "lag_2": q[-2] if len(q) >= 2 else 0.0,
        "lag_3": q[-3] if len(q) >= 3 else 0.0,
        "lag_ciclo": q[-ciclo] if len(q) >= ciclo else np.nan,
        "mm_4": float(np.mean(q[-4:])) if len(q) >= 4 else float(np.mean(q)) if len(q) else 0.0,
        "mm_8": float(np.mean(q[-8:])) if len(q) >= 8 else float(np.mean(q)) if len(q) else 0.0,
        "pct_ceros_12": float(np.mean(q[-12:] == 0)) if len(q) >= 12 else np.nan,
    }


def construir_panel(series: pd.DataFrame, origenes_fecha: list, horizonte: int,
                    ciclo: int, con_target: bool = True) -> pd.DataFrame:
    """Panel (serie × origen × k). Con target para entrenar; sin él para predecir.

    `series`: salida de datos.leer_series nivel producto (todas las series).
    `origenes_fecha`: fechas de origen; para cada una, target = demanda en
    origen + k (k = 1..horizonte). El período objetivo aporta su posición en
    el ciclo anual (periodo_ciclo)."""
    filas = []
    for sid, g in series.groupby("serie_id"):
        g = g.sort_values("periodo").reset_index(drop=True)
        idx_por_fecha = {p: i for i, p in enumerate(g["periodo"])}
        cat = g["categoria"].iloc[-1]
        q_full = g["cantidad"].to_numpy(float)
        for od in origenes_fecha:
            if od not in idx_por_fecha:
                continue                     # la serie aún no existía en este origen
            o = idx_por_fecha[od] + 1        # entrenar con datos hasta el origen inclusive
            if o < 8:
                continue
            base = _features_origen(q_full[:o], ciclo)
            for k in range(1, horizonte + 1):
                if con_target and o - 1 + k >= len(g):
                    break
                objetivo = g["periodo"].iloc[o - 1] + k * (
                    pd.Timedelta(weeks=1) if ciclo == 52 else pd.DateOffset(months=1))
                fila = dict(base, serie_id=sid, categoria=cat, k=k,
                            origen=od, objetivo=objetivo,
                            periodo_ciclo=(objetivo.isocalendar().week if ciclo == 52
                                           else objetivo.month))
                if con_target:
                    fila["y"] = q_full[o - 1 + k]
                filas.append(fila)
    return pd.DataFrame(filas)


FEATURES = ["lag_1", "lag_2", "lag_3", "lag_ciclo", "mm_4", "mm_8",
            "pct_ceros_12", "k", "periodo_ciclo", "categoria"]


def entrenar(panel_train: pd.DataFrame):
    from lightgbm import LGBMRegressor
    X = panel_train[FEATURES].copy()
    X["categoria"] = X["categoria"].astype("category")
    m = LGBMRegressor(**PARAMS)
    m.fit(X, panel_train["y"])
    return m


def predecir(modelo, panel_pred: pd.DataFrame) -> pd.DataFrame:
    X = panel_pred[FEATURES].copy()
    X["categoria"] = X["categoria"].astype("category")
    out = panel_pred[["serie_id", "origen", "k"]].copy()
    out["prediccion"] = np.maximum(modelo.predict(X), 0.0)
    return out
