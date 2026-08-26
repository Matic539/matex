import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  prediccionesApi,
  type Confianza,
  type DemandaSerie,
  type FilaCobertura,
  type Granularidad,
  type MetricasModelo,
} from '@/api/predicciones';
import { useAuth } from '@/context/AuthContext';
import { formatCantidad, formatFecha } from '@/lib/format';

// Módulo predictivo (RF-22, RF-23, RF-24) — PDP-02 P5.
// Política de presentación (RP4-01 §3): la fecha de quiebre se muestra como
// RANGO [estimada → pesimista] con nivel de confianza; nunca fecha puntual.

const CONFIANZA_BADGE: Record<Confianza, { variant: 'success' | 'secondary' | 'destructive' | 'outline'; texto: string }> = {
  alta: { variant: 'success', texto: 'Alta' },
  media: { variant: 'secondary', texto: 'Media' },
  baja: { variant: 'destructive', texto: 'Baja' },
  sin_modelo: { variant: 'outline', texto: 'Sin modelo' },
};

function RangoQuiebre({ fila }: { fila: FilaCobertura }) {
  // Confianza baja o sin modelo: alerta por stock mínimo, no fecha (RP4-01 §3)
  if (fila.confianza === 'baja' || fila.confianza === 'sin_modelo') {
    return fila.stock_actual <= fila.stock_minimo ? (
      <Badge variant="destructive">Bajo stock mínimo</Badge>
    ) : (
      <span className="text-muted-foreground">— revisar stock mínimo</span>
    );
  }
  if (!fila.fecha_quiebre_estimada && !fila.fecha_quiebre_pesimista) {
    return <span className="text-muted-foreground">Cubre el horizonte</span>;
  }
  const est = fila.fecha_quiebre_estimada ? formatFecha(fila.fecha_quiebre_estimada) : '>12 sem';
  const pes = fila.fecha_quiebre_pesimista ? formatFecha(fila.fecha_quiebre_pesimista) : '—';
  return (
    <span>
      {est} <span className="text-muted-foreground">→ {pes}</span>
    </span>
  );
}

export function Predicciones() {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';

  const [cobertura, setCobertura] = useState<FilaCobertura[]>([]);
  const [granularidad, setGranularidad] = useState<Granularidad>('semanal');
  const [serieId, setSerieId] = useState<number | null>(null);
  const [demanda, setDemanda] = useState<DemandaSerie | null>(null);
  const [metricas, setMetricas] = useState<MetricasModelo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setCargando(true);
    prediccionesApi
      .cobertura()
      .then((d) => {
        setCobertura(d);
        if (d.length && serieId === null) setSerieId(d[0].productoId);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDetalle = useCallback(() => {
    if (!esAdmin || serieId === null) return;
    prediccionesApi
      .demanda('producto', serieId, granularidad)
      .then(setDemanda)
      .catch((e: Error) => setError(e.message));
    prediccionesApi
      .metricas(granularidad)
      .then(setMetricas)
      .catch(() => setMetricas(null));
  }, [esAdmin, serieId, granularidad]);

  useEffect(cargarDetalle, [cargarDetalle]);

  const datosGrafico = useMemo(
    () =>
      (demanda?.serie ?? []).map((p) => ({
        periodo: formatFecha(p.periodo),
        real: p.real,
        prevista: p.prevista,
        banda: p.intervalo_inf != null && p.intervalo_sup != null
          ? [p.intervalo_inf, p.intervalo_sup]
          : undefined,
      })),
    [demanda],
  );

  const run = metricas?.runVigente ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Predicciones</h1>
          <p className="text-sm text-muted-foreground">
            Demanda proyectada y cobertura de stock por producto (RF-22/RF-23)
          </p>
        </div>
        {run && (
          <div className="text-right text-xs text-muted-foreground">
            <div>
              Corrida vigente: {formatFecha(run.ejecutado_en)} · horizonte {run.horizonte}{' '}
              {granularidad === 'semanal' ? 'semanas' : 'meses'}
            </div>
            {run.mape_global != null && (
              <div>
                Error del modelo (mediana backtesting): MAPE acum. {run.mape_global.toFixed(1)}% ·
                WAPE {run.wape_global?.toFixed(1)}% (RF-24)
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Cobertura de stock</CardTitle>
          <CardDescription>
            Fecha de quiebre como rango [estimada → pesimista]. Con confianza baja el sistema
            alerta por stock mínimo en lugar de proyectar una fecha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Demanda 4 sem</TableHead>
                <TableHead>Quiebre estimado → pesimista</TableHead>
                <TableHead className="text-right">Días cobertura</TableHead>
                <TableHead>Confianza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cobertura.map((f) => (
                <TableRow
                  key={f.productoId}
                  className={esAdmin ? 'cursor-pointer' : undefined}
                  onClick={esAdmin ? () => setSerieId(f.productoId) : undefined}
                  data-state={serieId === f.productoId ? 'selected' : undefined}
                >
                  <TableCell>
                    <div className="font-medium">{f.nombre}</div>
                    <div className="text-xs text-muted-foreground">{f.categoria}</div>
                  </TableCell>
                  <TableCell className="text-right">{formatCantidad(f.stock_actual)}</TableCell>
                  <TableCell className="text-right">
                    {f.demanda_prevista_4sem != null ? formatCantidad(f.demanda_prevista_4sem) : '—'}
                  </TableCell>
                  <TableCell>
                    <RangoQuiebre fila={f} />
                  </TableCell>
                  <TableCell className="text-right">{f.dias_cobertura ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={CONFIANZA_BADGE[f.confianza].variant}>
                      {CONFIANZA_BADGE[f.confianza].texto}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!cargando && cobertura.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin predicciones vigentes — ejecutar el pipeline predictivo (ml/)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {esAdmin && (
        <Card>
          <CardHeader className="flex-row items-end justify-between space-y-0">
            <div>
              <CardTitle>Demanda histórica y proyectada</CardTitle>
              <CardDescription>
                {demanda?.modelo
                  ? `Modelo: ${demanda.modelo} · MAPE acumulado ${demanda.mape_acum?.toFixed(1) ?? '—'}% (RF-24)`
                  : 'Selecciona un producto en la tabla'}
              </CardDescription>
            </div>
            <div className="w-40">
              <Label htmlFor="granularidad">Granularidad</Label>
              <Select
                id="granularidad"
                value={granularidad}
                onChange={(e) => setGranularidad(e.target.value as Granularidad)}
              >
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datosGrafico} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <Tooltip formatter={(v) => formatCantidad(Number(v))} />
                <Legend />
                <Area
                  dataKey="banda"
                  name="Intervalo (q10–q90)"
                  stroke="none"
                  fill="var(--primary)"
                  fillOpacity={0.12}
                  connectNulls
                />
                <Line
                  dataKey="real"
                  name="Demanda real"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  dataKey="prevista"
                  name="Prevista"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
