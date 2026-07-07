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

# Horizonte de predicción por granularidad (períodos)
HORIZONTE = {"semanal": 12, "mensual": 6}

# Carpeta de salidas del EDA (CSV + resúmenes)
SALIDAS_DIR = Path(__file__).resolve().parent / "eda" / "salidas"
SALIDAS_DIR.mkdir(parents=True, exist_ok=True)


def get_engine():
    return create_engine(DB_URL)
