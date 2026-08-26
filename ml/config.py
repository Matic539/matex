"""Configuración del módulo predictivo — Sistema Matex (PDP-02).

Misma convención que el ETL: todo sobreescribible por variable de entorno.
"""
import os
from pathlib import Path

from sqlalchemy import create_engine

# Conexión a la BD (igual que etl/config.py)
DB_URL = os.environ.get(
    "MATEX_DB_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/matex",
)

# Granularidad de trabajo: 'semanal' (defecto) o 'mensual' (PDP-02 §3)
GRANULARIDAD = os.environ.get("MATEX_GRANULARIDAD", "semanal")

# Fecha de corte de datos confiables (YYYY-MM-DD) o vacío para usar todo.
# Uso: mientras las ventas post-migración estén INCOMPLETAS en la BD
# (solo las registradas en la app), entrenar únicamente hasta el corte del
# Excel evita que el modelo aprenda una caída de demanda falsa (PDM-01).
# Quitar la variable cuando se complete el backfill de ventas.
FECHA_CORTE = os.environ.get("MATEX_FECHA_CORTE", "").strip() or None

# Horizonte de predicción por granularidad (períodos)
HORIZONTE = {"semanal": 12, "mensual": 6}

# Carpeta de salidas del EDA (CSV + resúmenes)
SALIDAS_DIR = Path(__file__).resolve().parent / "eda" / "salidas"
SALIDAS_DIR.mkdir(parents=True, exist_ok=True)


def get_engine():
    return create_engine(DB_URL)
