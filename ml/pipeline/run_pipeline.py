"""Orquestador del pipeline predictivo (P1 — PDP-02).

Orden fijo (regla C6): refresh vistas → leer series → predecir → escribir.

En Fase P1 el único "modelo" disponible es un placeholder de humo
(media móvil de los últimos 8 períodos) que valida el camino completo
BD → predicción → BD. Los modelos reales llegan en P2/P3.

Uso:
    python pipeline/run_pipeline.py --smoke                  # ambas granularidades
    python pipeline/run_pipeline.py --smoke -g semanal       # solo semanal
"""
import argparse
import logging
import subprocess
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import GRANULARIDAD, HORIZONTE, get_engine
from pipeline import datos

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("pipeline")

VENTANA_SMOKE = 8  # períodos de la media móvil placeholder


def version_codigo() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                              capture_output=True, text=True,
                              cwd=Path(__file__).parent).stdout.strip() or "dev"
    except OSError:
        return "dev"


def predecir_smoke(series: pd.DataFrame, granularidad: str, horizonte: int) -> pd.DataFrame:
    """Placeholder: media móvil de los últimos VENTANA_SMOKE períodos, plana."""
    freq = "W-MON" if granularidad == "semanal" else "MS"
    piezas = []
    for sid, g in series.groupby("serie_id"):
        media = g.sort_values("periodo")["cantidad"].tail(VENTANA_SMOKE).mean()
        futuros = pd.date_range(g["periodo"].max(), periods=horizonte + 1, freq=freq)[1:]
        piezas.append(pd.DataFrame({"serie_id": sid, "periodo": futuros,
                                    "cantidad_prevista": media}))
    return pd.concat(piezas, ignore_index=True)


def correr(granularidad: str, smoke: bool) -> int:
    eng = get_engine()
    horizonte = HORIZONTE[granularidad]
    algoritmo = "smoke-media-movil" if smoke else "mixto"
    run_id = datos.crear_run(eng, granularidad, horizonte, algoritmo, version_codigo())
    try:
        datos.refrescar_vistas(eng)
        total = 0
        for nivel in ("producto", "categoria"):
            series = datos.leer_series(eng, nivel, granularidad)
            if smoke:
                pred = predecir_smoke(series, granularidad, horizonte)
            else:
                raise NotImplementedError("Modelos reales: fases P2/P3 de PDP-02")
            total += datos.escribir_predicciones(eng, run_id, pred, nivel, granularidad)
        nota = f"corrida smoke P1 ({total} predicciones)" if smoke else None
        datos.cerrar_run(eng, run_id, "completado", notas=nota)
        return run_id
    except Exception as exc:  # noqa: BLE001 — el run queda auditado como fallido
        datos.cerrar_run(eng, run_id, "fallido", notas=str(exc)[:500])
        raise


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smoke", action="store_true",
                    help="corrida de humo con media móvil placeholder")
    ap.add_argument("-g", "--granularidad", choices=["semanal", "mensual", "ambas"],
                    default="ambas")
    args = ap.parse_args()

    grans = [args.granularidad] if args.granularidad != "ambas" else ["semanal", "mensual"]
    for g in grans:
        rid = correr(g, smoke=args.smoke)
        log.info("== Corrida %s OK (run_id=%d) ==", g, rid)


if __name__ == "__main__":
    main()
