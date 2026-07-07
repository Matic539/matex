# Módulo Predictivo — Sistema Matex

Pipeline batch en Python que entrena modelos de demanda y escribe predicciones en el esquema `analytics` (ver PDP-02). El backend Express **solo lee** las tablas de predicción.

## Setup

```bash
pip install -r requirements.txt
export MATEX_DB_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/matex"
```

## Estructura

```
ml/
├── config.py            # conexión, granularidad (MATEX_GRANULARIDAD), horizontes
├── eda/                 # Fase P0 — análisis exploratorio (cerrada, ver EDA-01)
│   ├── p01_series.py            # series semanales/mensuales por producto y categoría
│   ├── p02_caracterizacion.py   # intermitencia, ADI, CV², Syntetos-Boylan, estacionalidad
│   ├── p03_abc.py               # clasificación ABC y cruce con clase de demanda
│   └── salidas/                 # CSVs generados
└── (P1+) pipeline/      # entrenamiento, backtesting y escritura de predicciones
```

## Ejecutar el EDA

```bash
python eda/p01_series.py && python eda/p02_caracterizacion.py && python eda/p03_abc.py
```

Resultados e interpretación: `documentos/04_investigacion-marco-teorico/INFORME_EDA_MODULO_PREDICTIVO.md` (EDA-01).

## Reglas críticas

Ver PDP-02 §6 (cambios prohibidos C1–C9). En particular: no alterar las vistas de `analytics`, no entrenar desde Node, y solo el pipeline escribe en `analytics.prediccion_*`.
