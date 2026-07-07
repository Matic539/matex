"""P0.2 — Caracterización de las series de demanda.

Para cada serie (producto y categoría, semanal y mensual) calcula:
    n_periodos        largo de la serie (desde su primera venta)
    pct_ceros         % de períodos sin venta (intermitencia)
    adi               Average Demand Interval (períodos promedio entre ventas)
    cv2               coef. de variación al cuadrado de las cantidades > 0
    clase_sb          clasificación Syntetos-Boylan (ADI 1.32 / CV² 0.49):
                      suave | intermitente | erratica | irregular
    tendencia_anual   pendiente de regresión lineal, en unidades/año
    autocorr_estac    autocorrelación en el rezago estacional (52 sem / 12 mes)

Salida: ml/eda/salidas/caracterizacion_{gran}_{nivel}.csv

Uso:  python p02_caracterizacion.py   (requiere haber corrido p01_series.py)
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import SALIDAS_DIR

ADI_CORTE, CV2_CORTE = 1.32, 0.49
LAG_ESTACIONAL = {"semanal": 52, "mensual": 12}


def clase_sb(adi: float, cv2: float) -> str:
    if adi < ADI_CORTE:
        return "suave" if cv2 < CV2_CORTE else "erratica"
    return "intermitente" if cv2 < CV2_CORTE else "irregular"


def autocorr(x: np.ndarray, lag: int) -> float:
    if len(x) <= lag + 2 or np.std(x) == 0:
        return np.nan
    a, b = x[:-lag], x[lag:]
    if np.std(a) == 0 or np.std(b) == 0:
        return np.nan
    return float(np.corrcoef(a, b)[0, 1])


def caracterizar(g: pd.DataFrame, gran: str) -> pd.Series:
    q = g.sort_values("periodo")["cantidad"].to_numpy(dtype=float)
    nz = q[q > 0]
    n = len(q)
    adi = n / len(nz) if len(nz) else np.inf
    cv2 = (np.std(nz) / np.mean(nz)) ** 2 if len(nz) > 1 else 0.0
    # tendencia: pendiente por período → anualizada
    per_por_anio = 52 if gran == "semanal" else 12
    pend = np.polyfit(np.arange(n), q, 1)[0] * per_por_anio if n > 2 else np.nan
    return pd.Series({
        "n_periodos": n,
        "pct_ceros": round(100 * (1 - len(nz) / n), 1) if n else np.nan,
        "adi": round(adi, 2),
        "cv2": round(cv2, 2),
        "clase_sb": clase_sb(adi, cv2),
        "tendencia_anual": round(pend, 1),
        "autocorr_estac": round(autocorr(q, LAG_ESTACIONAL[gran]), 2),
        "cantidad_total": q.sum(),
        "monto_neto_total": g["monto_neto"].sum(),
    })


def main() -> None:
    for gran in ("semanal", "mensual"):
        for nivel, claves in (("producto", ["producto_id", "codigo", "nombre", "categoria"]),
                              ("categoria", ["categoria"])):
            df = pd.read_csv(SALIDAS_DIR / f"series_{gran}_{nivel}.csv")
            res = (df.groupby(claves)
                     .apply(caracterizar, gran=gran, include_groups=False)
                     .reset_index())
            out = SALIDAS_DIR / f"caracterizacion_{gran}_{nivel}.csv"
            res.to_csv(out, index=False)
            resumen = res["clase_sb"].value_counts().to_dict() if nivel == "producto" else ""
            print(f"[{gran}/{nivel}] {len(res)} series → {out.name} {resumen}")


if __name__ == "__main__":
    main()
