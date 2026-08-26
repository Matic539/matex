"""P6 — Re-validación con holdout (cierra la limitación 1 de RP3-01 §4).

El torneo P3 selecciona y reporta con los mismos folds → sus cifras son
levemente optimistas. Aquí se separan los roles:

    SELECCIÓN:  folds rodantes dentro de [fin-64, fin-12) semanas
                (para mensual: [fin-15, fin-3) meses)
    EVALUACIÓN: UNA sola pasada sobre el tramo final NUNCA usado
                (últimas 12 semanas / 3 meses)

El ganador se elige sin ver el holdout; la métrica reportada es la del
holdout. Es la estimación insesgada del rendimiento real del módulo.

Salida: eda/salidas/holdout_resultados.csv + resumen por consola.

Uso:  python pipeline/holdout.py
"""
import logging
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import SALIDAS_DIR, get_engine
from pipeline import datos
from pipeline.metricas import mape_acumulado, wape
from pipeline.modelos import BASELINES, REGISTRO, media_movil

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("holdout")

CONF = {
    "semanal": dict(h=12, ciclo=52, sel_ini=64, paso=4),
    "mensual": dict(h=3, ciclo=12, sel_ini=15, paso=1),
}


def _wape_seleccion(q: np.ndarray, fn, h: int, ciclo: int,
                    sel_ini: int, paso: int) -> float:
    """WAPE promedio del modelo en la ventana de selección (sin holdout)."""
    n = len(q)
    vals = []
    for o in range(max(8, n - sel_ini), n - 2 * h + 1, paso):
        pred = fn(q[:o], h, ciclo)
        if pred is None:
            return np.inf
        v = wape(q[o:o + h], pred)
        if not np.isnan(v):
            vals.append(v)
    return float(np.mean(vals)) if len(vals) >= 2 else np.inf


def main() -> None:
    eng = get_engine()
    filas = []
    for gran, c in CONF.items():
        series = datos.leer_series(eng, "producto", gran)
        montos = series.groupby("serie_id")["monto_neto"].sum().sort_values(ascending=False)
        acum = 100 * montos.cumsum() / montos.sum()
        clase = pd.cut(acum, [0, 80, 95, 100.001], labels=list("ABC"))

        for sid, g in series.groupby("serie_id"):
            g = g.sort_values("periodo")
            q = g["cantidad"].to_numpy(float)
            n, h = len(q), c["h"]
            if n < c["sel_ini"] + 4:
                continue
            train_final, test_final = q[: n - h], q[n - h:]

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                # 1) selección SIN ver el holdout
                puntajes = {nom: _wape_seleccion(q[: n - h], fn, h, c["ciclo"],
                                                 c["sel_ini"], c["paso"])
                            for nom, fn in REGISTRO.items()}
                ganador = min(puntajes, key=puntajes.get)
                base = min({k: v for k, v in puntajes.items() if k in BASELINES},
                           key=lambda k: puntajes[k])
                # 2) evaluación única en el holdout
                def _eval(nombre: str) -> tuple[float, float]:
                    fn = REGISTRO[nombre]
                    pred = fn(train_final, h, c["ciclo"])
                    if pred is None:
                        pred = media_movil(train_final, h, c["ciclo"])
                    return wape(test_final, pred), mape_acumulado(test_final, pred)

                wape_g, macum_g = _eval(ganador)
                wape_b, macum_b = _eval(base)

            filas.append(dict(
                granularidad=gran, serie_id=sid, nombre=g.iloc[-1]["nombre"],
                clase=str(clase.get(sid, "C")), ganador=ganador,
                wape_holdout=wape_g, mape_acum_holdout=macum_g,
                baseline=base, wape_baseline_holdout=wape_b,
                mape_acum_baseline_holdout=macum_b,
                skill_pct=(100 * (1 - wape_g / wape_b)
                           if wape_b and not np.isnan(wape_b) and wape_b > 0 else np.nan),
            ))

    df = pd.DataFrame(filas)
    df.round(2).to_csv(SALIDAS_DIR / "holdout_resultados.csv", index=False)

    print("\n== Holdout (evaluación insesgada, tramo final nunca visto) ==")
    for gran in CONF:
        a = df.query("granularidad==@gran and clase=='A'").dropna(subset=["wape_holdout"])
        if a.empty:
            continue
        print(f"[{gran}] clase A (n={len(a)}): "
              f"M2 acum mediana torneo→holdout: {a['mape_acum_holdout'].median():.1f}% "
              f"(baseline {a['mape_acum_baseline_holdout'].median():.1f}%) · "
              f"WAPE mediana {a['wape_holdout'].median():.1f}% "
              f"(baseline {a['wape_baseline_holdout'].median():.1f}%) · "
              f"skill mediano {a['skill_pct'].median():+.1f}%")


if __name__ == "__main__":
    main()
