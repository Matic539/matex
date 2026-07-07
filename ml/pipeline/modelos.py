"""Modelos candidatos del torneo de backtesting (PDP-02 P2/P3).

Interfaz común:  f(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray
    train      historia de la serie (ordenada, períodos completos con ceros)
    horizonte  cantidad de períodos a predecir
    ciclo      largo estacional (52 semanal, 12 mensual)

P2 registra solo los baselines; los modelos de P3 (ETS, SARIMA, LightGBM)
se agregan a REGISTRO sin tocar el motor de backtesting.
"""
import numpy as np

VENTANA_MM = 8


def media_movil(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray:
    """Promedio de los últimos VENTANA_MM períodos, proyectado plano.
    Equivale conceptualmente a la proyección simple de RF-27 (baseline mínimo)."""
    media = float(np.mean(train[-VENTANA_MM:])) if len(train) else 0.0
    return np.full(horizonte, max(0.0, media))


def naive_estacional(train: np.ndarray, horizonte: int, ciclo: int) -> np.ndarray:
    """Repite el valor del mismo período del ciclo anterior (misma semana/mes
    del año pasado). Si la historia no alcanza un ciclo completo, cae a media móvil."""
    if len(train) < ciclo:
        return media_movil(train, horizonte, ciclo)
    pred = np.empty(horizonte)
    for k in range(horizonte):
        pred[k] = train[len(train) - ciclo + (k % ciclo)]
    return np.maximum(pred, 0.0)


REGISTRO = {
    "media-movil-8": media_movil,
    "naive-estacional": naive_estacional,
}
