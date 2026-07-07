"""P0.3 — Clasificación ABC (por monto neto) y cruce ABC × clase de demanda.

ABC clásico sobre contribución acumulada al monto neto total:
    A ≤ 80% · B ≤ 95% · C resto

Salidas:
    abc_productos.csv      producto + monto, %acum, clase ABC, clase SB (semanal)
    abc_resumen.csv        tabla cruzada ABC × clase_sb con conteos y % del monto

Uso:  python p03_abc.py   (requiere p01 y p02)
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import SALIDAS_DIR


def main() -> None:
    car = pd.read_csv(SALIDAS_DIR / "caracterizacion_semanal_producto.csv")
    df = car.sort_values("monto_neto_total", ascending=False).reset_index(drop=True)
    total = df["monto_neto_total"].sum()
    df["pct_monto"] = 100 * df["monto_neto_total"] / total
    df["pct_acum"] = df["pct_monto"].cumsum()
    df["clase_abc"] = pd.cut(df["pct_acum"], [0, 80, 95, 100.001], labels=list("ABC"))

    cols = ["producto_id", "codigo", "nombre", "categoria", "monto_neto_total",
            "pct_monto", "pct_acum", "clase_abc", "clase_sb", "pct_ceros", "adi", "n_periodos"]
    df[cols].round(2).to_csv(SALIDAS_DIR / "abc_productos.csv", index=False)

    resumen = (df.groupby(["clase_abc", "clase_sb"], observed=True)
                 .agg(n_productos=("producto_id", "count"),
                      pct_monto=("pct_monto", "sum"))
                 .round(1).reset_index())
    resumen.to_csv(SALIDAS_DIR / "abc_resumen.csv", index=False)

    print(df["clase_abc"].value_counts().sort_index().to_string())
    print("\nCruce ABC × clase de demanda (semanal):")
    print(resumen.to_string(index=False))


if __name__ == "__main__":
    main()
