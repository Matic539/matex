import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertTriangle, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { reportesApi, type DashboardData } from '@/api/reportes';
import { formatCLP, formatCantidad, formatFecha } from '@/lib/format';

// RF-28: dashboard en línea del administrador, sobre el esquema analytics
export function Dashboard() {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async (d: number) => {
    try {
      setData(await reportesApi.dashboard(d));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el dashboard');
    }
  }, []);

  useEffect(() => {
    void cargar(dias);
  }, [dias, cargar]);

  async function refrescar() {
    setRefrescando(true);
    try {
      await reportesApi.refresh();
      await cargar(dias);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar datos');
    } finally {
      setRefrescando(false);
    }
  }

  const serie =
    data?.serieDiaria.map((p) => ({ ...p, dia: formatFecha(p.fecha).slice(0, 5) })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Select
            className="w-40"
            value={String(dias)}
            onChange={(e) => setDias(Number(e.target.value))}
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
          </Select>
          <Button variant="outline" onClick={refrescar} disabled={refrescando}>
            <RefreshCw className={refrescando ? 'animate-spin' : ''} />
            {refrescando ? 'Actualizando…' : 'Actualizar datos'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Datos del esquema analítico.{' '}
        {data?.ultimaActualizacion
          ? `Última actualización: ${new Date(data.ultimaActualizacion).toLocaleString('es-CL')}.`
          : 'Presiona “Actualizar datos” para refrescar las vistas materializadas.'}
      </p>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" /> Ventas del período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data ? formatCLP(data.kpis.monto) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShoppingCart className="size-4" /> Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.kpis.transacciones ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="size-4" /> Unidades vendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data ? formatCantidad(data.kpis.unidades) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className={data && data.kpis.productosBajoMinimo > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="size-4" /> Bajo stock mínimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                data && data.kpis.productosBajoMinimo > 0 ? 'text-destructive' : ''
              }`}
            >
              {data?.kpis.productosBajoMinimo ?? '—'}
            </p>
            <Link to="/inventario" className="text-xs text-muted-foreground hover:underline">
              Ver alertas en inventario →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia diaria */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas diarias</CardTitle>
          <CardDescription>Monto bruto por día (CLP)</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => (v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}k`)}
                width={48}
              />
              <Tooltip formatter={(v) => formatCLP(Number(v))} labelFormatter={(l) => `Día ${l}`} />
              <Line
                type="monotone"
                dataKey="monto"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                name="Monto"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top productos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 productos</CardTitle>
            <CardDescription>Por monto vendido en el período</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.topProductos ?? []}
                layout="vertical"
                margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => (v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}k`)}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fontSize: 11 }}
                  width={140}
                  tickFormatter={(n: string) => (n.length > 20 ? `${n.slice(0, 19)}…` : n)}
                />
                <Tooltip formatter={(v) => formatCLP(Number(v))} />
                <Bar dataKey="monto" fill="var(--primary)" radius={[0, 4, 4, 0]} name="Monto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas por categoría</CardTitle>
            <CardDescription>Monto bruto en el período</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.porCategoria ?? []}
                margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="categoria"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(n: string) => (n.length > 12 ? `${n.slice(0, 11)}…` : n)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => (v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}k`)}
                  width={48}
                />
                <Tooltip formatter={(v) => formatCLP(Number(v))} />
                <Bar dataKey="monto" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Monto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
