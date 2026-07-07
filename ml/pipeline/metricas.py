"""Métricas de error del módulo predictivo (PDP-02 / EDA-01 §5).

Convención: `real` y `pred` son arrays del mismo largo (horizonte).
Todas retornan porcentaje (0–100) o NaN si no son computables.
"""
import numpy as np


def mape(real: np.ndarray, pred: np.ndarray) -> float:
    """MAPE clásico, solo sobre períodos con demanda real > 0 (evita división por cero
    en series intermitentes; ver EDA-01 §5)."""
    real, pred = np.asarray(real, float), np.asarray(pred, float)
    m = real > 0
    if not m.any():
        return float("nan")
    return float(100 * np.mean(np.abs(real[m] - pred[m]) / real[m]))


def wape(real: np.ndarray, pred: np.ndarray) -> float:
    """WAPE = suma de errores absolutos / demanda total. Robusto con ceros (M3)."""
    real, pred = np.asarray(real, float), np.asarray(pred, float)
    total = real.sum()
    if total <= 0:
        return float("nan")
    return float(100 * np.abs(real - pred).sum() / total)


def mape_acumulado(real: np.ndarray, pred: np.ndarray) -> float:
    """Error de la demanda ACUMULADA del horizonte (M2): es el que determina
    la fecha de quiebre de stock (RF-23), ver EDA-01 §5."""
    real, pred = np.asarray(real, float), np.asarray(pred, float)
    total = real.sum()
    if total <= 0:
        return float("nan")
    return float(100 * abs(pred.sum() - total) / total)
