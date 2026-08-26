"""P4.4 — Medición de M4: error en la fecha de quiebre de stock (backtesting).

Simulación sin fuga temporal: en cada origen del backtesting se supone un
stock inicial igual a la demanda real acumulada de las próximas `w` semanas
(w = 4 y 8). Así, la fecha real de quiebre es exactamente el fin de la
semana w, y la fecha predicha es cuando la demanda acumulada PREDICHA por el
modelo ganador cruza ese mismo stock. El error M4 = |semanas de diferencia|.

Esto mide exactamente lo que RP3-01 §5(iii) exige:
    "fecha de quiebre con error ≤ 7 días (1 semana) en ≥ 70% de clase A".

Salida: eda/salidas/m4_resultados.csv + resumen por consola.

Uso:  python pipeline/evaluar_m4.py   (requiere torneo P3 corrido)
"""
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import HORIZONTE, SALIDAS_DIR, get_engine
from pipeline import datos
from pipeline.modelos import REGISTRO, media_movil
from pipeline.predictor import cargar_seleccion

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("m4")

GRAN = "semanal"
H = 12
N_VAL, PASO = 52, 4
VENTANAS = (4, 8)          # semanas de stock simulado


def semana_cruce(acum: np.ndarray, stock: float) -> int | None:
    """Primera semana (1-index) en que la demanda acumulada alcanza el stock."""
    idx = np.argmax(acum >= stock - 1e-9)
    return int(idx) + 1 if acum[idx] >= stock - 1e-9 else None


def main() -> None:
    eng = get_engine()
    seleccion = cargar_seleccion()
    sel = seleccion.query("nivel=='producto' and granularidad==@GRAN")
    ganador = dict(zip(sel["serie_id"], sel["modelo_ganador"]))

    series = datos.leer_series(eng, "producto", GRAN)
    montos = (series.groupby("serie_id")["monto_neto"].sum()
                    .sort_values(ascending=False))
    acum_m = 100 * montos.cumsum() / montos.sum()
    clase_a = set(acum_m[acum_m <= 80].index)

    filas = []
    for sid, g in series.groupby("serie_id"):
        g = g.sort_values("periodo")
        q = g["cantidad"].to_numpy(float)
        modelo = ganador.get(sid, "media-movil-8")
        # lgbm-global no es por-serie: para M4 usamos su respaldo estadístico
        fn = REGISTRO.get(modelo if modelo != "lgbm-global" else "ets-damped", media_movil)
        n = len(q)
        for o in range(max(8, n - N_VAL), n - H + 1, PASO):
            pred = fn(q[:o], H, 52)
            if pred is None:
                pred = media_movil(q[:o], H, 52)
            acum_real = np.cumsum(q[o:o + H])
            acum_pred = np.cumsum(pred)
            for w in VENTANAS:
                stock = acum_real[w - 1]
                if stock <= 0:
                    continue                 # sin demanda real: no hay quiebre que medir
                sem_pred = semana_cruce(acum_pred, stock)
                err = abs(sem_pred - w) if sem_pred else H - w  # nunca cruza: error máximo
                filas.append(dict(serie_id=sid, nombre=g.iloc[-1]["nombre"],
                                  clase="A" if sid in clase_a else "BC",
                                  modelo=modelo, ventana=w, error_semanas=err))
    df = pd.DataFrame(filas)
    df.to_csv(SALIDAS_DIR / "m4_resultados.csv", index=False)

    print("\n== M4: error en fecha de quiebre (backtesting, semanas) ==")
    for clase in ("A", "BC"):
        for w in VENTANAS:
            d = df.query("clase==@clase and ventana==@w")["error_semanas"]
            if d.empty:
                continue
            print(f"clase {clase} · stock {w} sem: mediana {d.median():.1f} sem · "
                  f"≤1 sem: {100*(d<=1).mean():.0f}% · ≤2 sem: {100*(d<=2).mean():.0f}% "
                  f"(n={len(d)})")
    # criterio RP3-01 §5(iii)
    a4 = df.query("clase=='A' and ventana==4")["error_semanas"]
    if len(a4):
        pct = 100 * (a4 <= 1).mean()
        print(f"\nCriterio (iii): {pct:.0f}% de casos clase A con error ≤ 1 semana "
              f"(objetivo ≥ 70%) → {'CUMPLE' if pct >= 70 else 'NO CUMPLE'}")


if __name__ == "__main__":
    main()
