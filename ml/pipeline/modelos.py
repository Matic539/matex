"""Modelos candidatos del torneo de backtesting (PDP-02 P2/P3).

Interfaz común:  f(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray | None
    train      historia de la serie (ordenada, períodos completos con ceros)
    horizonte  cantidad de períodos a predecir
    ciclo      largo estacional (52 semanal, 12 mensual)
    None       => el modelo no aplica a esta serie/granularidad (se omite del torneo)

El modelo global (LightGBM) vive en modelo_global.py: necesita el panel
completo de series, no calza con esta interfaz por-serie.
"""
import warnings

import numpy as np

VENTANA_MM = 8


# --- Baselines (P2) ---------------------------------------------------------

def media_movil(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray:
    """Promedio de los últimos VENTANA_MM períodos, proyectado plano.
    Equivale conceptualmente a la proyección simple de RF-27 (baseline mínimo)."""
    media = float(np.mean(train[-VENTANA_MM:])) if len(train) else 0.0
    return np.full(horizonte, max(0.0, media))


def naive_estacional(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray:
    """Repite el valor del mismo período del ciclo anterior. Si la historia
    no alcanza un ciclo completo, cae a media móvil."""
    if len(train) < ciclo:
        return media_movil(train, horizonte, ciclo)
    pred = np.empty(horizonte)
    for k in range(horizonte):
        pred[k] = train[len(train) - ciclo + (k % ciclo)]
    return np.maximum(pred, 0.0)


# --- Modelos estadísticos (P3) ---------------------------------------------

def ets(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray | None:
    """Suavizamiento exponencial (Holt damped). Estacionalidad aditiva solo si
    hay >= 2 ciclos completos de historia (en semanal rara vez ayuda: la
    autocorrelación estacional es débil, EDA-01 §4.4)."""
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    if len(train) < 12 or np.count_nonzero(train) < 5:
        return None
    usar_estacional = len(train) >= 2 * ciclo + 4 and ciclo <= 12
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            m = ExponentialSmoothing(
                train.astype(float),
                trend="add", damped_trend=True,
                seasonal="add" if usar_estacional else None,
                seasonal_periods=ciclo if usar_estacional else None,
                initialization_method="estimated",
            ).fit(optimized=True)
            return np.maximum(m.forecast(horizonte), 0.0)
        except Exception:
            return None


def sarima(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray | None:
    """SARIMA (1,1,1)(0,1,1)s — solo granularidad MENSUAL (ciclo 12): en
    semanal (s=52) el costo computacional no se justifica con autocorrelación
    estacional débil. Requiere >= 3 ciclos de historia."""
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    if ciclo != 12 or len(train) < 3 * ciclo or np.count_nonzero(train) < 8:
        return None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            m = SARIMAX(train.astype(float), order=(1, 1, 1),
                        seasonal_order=(0, 1, 1, ciclo),
                        enforce_stationarity=False, enforce_invertibility=False,
                        ).fit(disp=False, maxiter=100)
            return np.maximum(m.forecast(horizonte), 0.0)
        except Exception:
            return None


def croston_sba(train: np.ndarray, horizonte: int, ciclo: int,
                alfa: float = 0.15) -> np.ndarray | None:
    """Croston con corrección Syntetos-Boylan (SBA): el método estándar para
    demanda intermitente. Solo aplica si la serie tiene >= 25% de ceros."""
    nz_idx = np.flatnonzero(train)
    if len(train) < 8 or len(nz_idx) < 3:
        return None
    if 1 - len(nz_idx) / len(train) < 0.25:   # serie no intermitente
        return None
    # suavizamiento de tamaños e intervalos de demanda
    z = train[nz_idx].astype(float)           # tamaños
    x = np.diff(np.concatenate([[-1], nz_idx])).astype(float)  # intervalos
    zh, xh = z[0], x[0]
    for k in range(1, len(z)):
        zh += alfa * (z[k] - zh)
        xh += alfa * (x[k] - xh)
    tasa = (1 - alfa / 2) * zh / xh           # corrección SBA
    return np.full(horizonte, max(0.0, tasa))


REGISTRO = {
    "media-movil-8": media_movil,
    "naive-estacional": naive_estacional,
    "ets-damped": ets,
    "sarima-111-011-12": sarima,
    "croston-sba": croston_sba,
}

BASELINES = ("media-movil-8", "naive-estacional")
