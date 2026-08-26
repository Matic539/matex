"""P4.1 — Predicción real con el modelo ganador por serie + intervalos empíricos.

Usa `eda/salidas/seleccion_modelos.csv` (resultado del torneo P3) para saber
qué modelo aplicar a cada serie. Si una serie no tiene ganador registrado
(historia corta, producto nuevo), cae al fallback: media móvil, y a futuro
el patrón de su categoría (P3.5).

Intervalos de predicción EMPÍRICOS: se re-corre el ganador sobre los
orígenes de validación y se toman los cuantiles (q10, q90) de los residuos
aditivos por paso. Sin supuestos de normalidad — coherente con demanda
errática (RP3-01).
"""
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from config import HORIZONTE, SALIDAS_DIR
from pipeline import modelo_global
from pipeline.modelos import REGISTRO, media_movil

log = logging.getLogger("predictor")

CICLO = {"semanal": 52, "mensual": 12}
N_VALIDACION = {"semanal": 52, "mensual": 12}
PASO = {"semanal": 4, "mensual": 1}
# VOS-01 mejora V2: cobertura observada de q10-q90 fue 73% (<80% objetivo)
# → se amplía a q05-q95 para que la fecha pesimista de quiebre proteja más.
Q_INF, Q_SUP = 5, 95


def cargar_seleccion() -> pd.DataFrame:
    f = Path(SALIDAS_DIR) / "seleccion_modelos.csv"
    if not f.exists():
        raise FileNotFoundError(
            f"No existe {f}. Correr primero: python pipeline/torneo.py (P3)")
    return pd.read_csv(f)


def _residuos_por_paso(q: np.ndarray, fn, gran: str) -> np.ndarray | None:
    """Matriz de residuos (real - pred) por fold × paso, del modelo por-serie."""
    h, ciclo = HORIZONTE[gran], CICLO[gran]
    n = len(q)
    ini = max(8, n - N_VALIDACION[gran])
    residuos = []
    for o in range(ini, n - h + 1, PASO[gran]):
        pred = fn(q[:o], h, ciclo)
        if pred is None:
            return None
        residuos.append(q[o:o + h] - pred)
    return np.array(residuos) if len(residuos) >= 2 else None


def predecir_serie(q: np.ndarray, modelo: str, gran: str) -> pd.DataFrame | None:
    """Predicción puntual + intervalos para una serie con su modelo ganador."""
    h, ciclo = HORIZONTE[gran], CICLO[gran]
    fn = REGISTRO.get(modelo, media_movil)
    pred = fn(q, h, ciclo)
    if pred is None:                       # el ganador ya no aplica (datos cambiaron)
        fn, pred = media_movil, media_movil(q, h, ciclo)
    res = _residuos_por_paso(q, fn, gran)
    if res is not None:
        inf = pred + np.percentile(res, Q_INF, axis=0)
        sup = pred + np.percentile(res, Q_SUP, axis=0)
    else:                                  # sin folds suficientes: banda por dispersión
        s = np.std(q[-N_VALIDACION[gran]:]) if len(q) else 0.0
        inf, sup = pred - 1.3 * s, pred + 1.3 * s
    return pd.DataFrame({"k": np.arange(1, h + 1),
                         "cantidad_prevista": np.maximum(pred, 0.0),
                         "intervalo_inf": np.maximum(inf, 0.0),
                         "intervalo_sup": np.maximum(sup, 0.0)})


def predecir_lgbm_global(series: pd.DataFrame, ids_lgbm: set, gran: str) -> dict:
    """Predicciones del modelo global para las series que ganó, entrenando con
    toda la historia. Retorna {serie_id: DataFrame(k, cantidad_prevista)}."""
    if not ids_lgbm:
        return {}
    h, ciclo = HORIZONTE[gran], CICLO[gran]
    fechas = sorted(series["periodo"].unique())
    orig_train = fechas[8::2 if gran == "semanal" else 1]
    panel = modelo_global.construir_panel(series, orig_train, h, ciclo, con_target=True)
    if panel.empty:
        return {}
    m = modelo_global.entrenar(panel)
    ultimo = fechas[-1]
    panel_pred = modelo_global.construir_panel(series, [ultimo], h, ciclo, con_target=False)
    pred = modelo_global.predecir(m, panel_pred)
    out = {}
    for sid, g in pred.groupby("serie_id"):
        if sid in ids_lgbm:
            g = g.sort_values("k")
            out[sid] = pd.DataFrame({"k": g["k"].to_numpy(),
                                     "cantidad_prevista": g["prediccion"].to_numpy()})
    return out


def predecir_nivel(series: pd.DataFrame, seleccion: pd.DataFrame,
                   nivel: str, gran: str) -> pd.DataFrame:
    """Predicciones de todas las series de un nivel, con periodo futuro."""
    h = HORIZONTE[gran]
    sel = seleccion.query("nivel == @nivel and granularidad == @gran")
    ganador = dict(zip(sel["serie_id"], sel["modelo_ganador"]))
    ids_lgbm = {sid for sid, m in ganador.items() if m == "lgbm-global"}
    preds_lgbm = predecir_lgbm_global(series, ids_lgbm, gran) if nivel == "producto" else {}

    freq = pd.Timedelta(weeks=1) if gran == "semanal" else pd.DateOffset(months=1)
    piezas = []
    for sid, g in series.groupby("serie_id"):
        g = g.sort_values("periodo")
        q = g["cantidad"].to_numpy(float)
        modelo = ganador.get(sid, "media-movil-8")
        if sid in preds_lgbm:
            df = preds_lgbm[sid]
            # intervalos del lgbm: residuos del fallback estadístico como aproximación conservadora
            aux = predecir_serie(q, "ets-damped", gran)
            ancho_inf = aux["cantidad_prevista"] - aux["intervalo_inf"]
            ancho_sup = aux["intervalo_sup"] - aux["cantidad_prevista"]
            df["intervalo_inf"] = np.maximum(df["cantidad_prevista"] - ancho_inf, 0.0)
            df["intervalo_sup"] = df["cantidad_prevista"] + ancho_sup
        else:
            df = predecir_serie(q, modelo, gran)
        ultimo = g["periodo"].max()
        df["periodo"] = [ultimo + k * freq for k in df["k"]]
        df["serie_id"], df["modelo"] = sid, modelo
        piezas.append(df)
    out = pd.concat(piezas, ignore_index=True)
    log.info("Predicciones %s/%s: %d series × %d períodos", nivel, gran,
             out["serie_id"].nunique(), h)
    return out
