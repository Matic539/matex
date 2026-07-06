import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  reportesApi,
  type FilaProyeccion,
  type FilaRotacion,
  type FilaVentasCategoria,
} from '@/api/reportes';
import { descargarCSV } from '@/lib/csv';
import { formatCLP, formatCantidad } from '@/lib/format';

type Pestana = 'rotacion' | 'categorias' | 'proyeccion';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// RF-25 (rotación), RF-26 (ventas por categoría), RF-27 (proyección provisional)
export function Reportes() {
  const [pestana, setPestana] = useState<Pestana>('rotacion');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ventana, setVentana] = useState(30);

  const [rotacion, setRotacion] = useState<FilaRotacion[]>([]);
  const [categorias, setCategorias] = useState<FilaVentasCategoria[]>([]);
  const [proyeccion, setProyeccion] = useState<FilaProyeccion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      if (pestana === 'rotacion') {
        setRotacion(await reportesApi.rotacion(desde || undefined, hasta || undefined));
      } else if (pestana === 'categorias') {
        setCategorias(await reportesApi.ventasCategoria(desde || undefined, hasta || undefined));
      } else {
        setProyeccion(await reportesApi.proyeccion(ventana, 30));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el reporte');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, desde, hasta, ventana]);

  async function refrescar() {
    setRefrescando(true);
    try {
      await reportesApi.refresh();
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar datos');
    } finally {
      setRefrescando(false);
    }
  }

  function exportar() {
    if (pestana === 'rotacion') {
      descargarCSV(
        'rotacion_inventario',
        [
          { clave: 'codigo', titulo: 'Código' },
          { clave: 'nombre', titulo: 'Producto' },
          { clave: 'categoria', titulo: 'Categoría' },
          { clave: 'unidades_vendidas', titulo: 'Unidades vendidas' },
          { clave: 'monto_vendido', titulo: 'Monto vendido' },
          { clave: 'stock_promedio', titulo: 'Stock promedio' },
          { clave: 'indice_rotacion', titulo: 'Índice rotación' },
        ],
        rotacion as unknown as Record<string, unknown>[],
      );
    } else if (pestana === 'categorias') {
      descargarCSV(
        'ventas_por_categoria',
        [
          { clave: 'anio', titulo: 'Año' },
          { clave: 'mes', titulo: 'Mes' },
          { clave: 'categoria', titulo: 'Categoría' },
          { clave: 'monto', titulo: 'Monto' },
          { clave: 'unidades', titulo: 'Unidades' },
          { clave: 'transacciones', titulo: 'Transacciones' },
        ],
        categorias as unknown as Record<string, unknown>[],
      );
    } else {
      descargarCSV(
        'proyeccion_stock',
        [
          { clave: 'codigo', titulo: 'Código' },
          { clave: 'nombre', titulo: 'Producto' },
          { clave: 'categoria', titulo: 'Categoría' },
          { clave: 'stock_actual', titulo: 'Stock actual' },
          { clave: 'venta_diaria_promedio', titulo: 'Venta diaria promedio' },
          { clave: 'dias_cobertura', titulo: 'Días de cobertura' },
          { clave: 'sugerencia_reposicion', titulo: 'Sugerencia reposición' },
        ],
        proyeccion as unknown as Record<string, unknown>[],
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refrescar} disabled={refrescando}>
            <RefreshCw className={refrescando ? 'animate-spin' : ''} />
            Actualizar datos
          </Button>
          <Button onClick={exportar}>
            <Download />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 border-b">
        {(
          [
            ['rotacion', 'Rotación de inventario'],
            ['categorias', 'Ventas por categoría'],
            ['proyeccion', 'Proyección de stock'],
          ] as [Pestana, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              pestana === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setPestana(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        {pestana !== 'proyeccion' ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="r-desde" className="text-xs text-muted-foreground">
                Desde
              </Label>
              <Input id="r-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-hasta" className="text-xs text-muted-foreground">
                Hasta
              </Label>
              <Input id="r-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              Sin fechas: {pestana === 'rotacion' ? 'últimos 90 días' : 'últimos 12 meses'}.
            </p>
          </>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ventana de historia</Label>
            <Select className="w-44" value={String(ventana)} onChange={(e) => setVentana(Number(e.target.value))}>
              <option value="30">Últimos 30 días</option>
              <option value="60">Últimos 60 días</option>
              <option value="90">Últimos 90 días</option>
            </Select>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {/* RF-25: Rotación */}
      {pestana === 'rotacion' && !cargando && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Unidades vendidas</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Stock promedio</TableHead>
              <TableHead className="text-right">Índice rotación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rotacion.map((f) => (
              <TableRow key={f.productoId}>
                <TableCell className="font-mono text-xs">{f.codigo}</TableCell>
                <TableCell className="font-medium">{f.nombre}</TableCell>
                <TableCell>{f.categoria}</TableCell>
                <TableCell className="text-right">{formatCantidad(f.unidades_vendidas)}</TableCell>
                <TableCell className="text-right">{formatCLP(f.monto_vendido)}</TableCell>
                <TableCell className="text-right">
                  {f.stock_promedio !== null ? formatCantidad(f.stock_promedio) : '—'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {f.indice_rotacion !== null ? f.indice_rotacion.toFixed(2) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* RF-26: Ventas por categoría */}
      {pestana === 'categorias' && !cargando && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Transacciones</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((f, i) => (
              <TableRow key={i}>
                <TableCell>
                  {MESES[f.mes - 1]} {f.anio}
                </TableCell>
                <TableCell className="font-medium">{f.categoria}</TableCell>
                <TableCell className="text-right">{formatCantidad(f.unidades)}</TableCell>
                <TableCell className="text-right">{f.transacciones}</TableCell>
                <TableCell className="text-right font-medium">{formatCLP(f.monto)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* RF-27: Proyección de stock (provisional, promedio móvil) */}
      {pestana === 'proyeccion' && !cargando && (
        <>
          <Card>
            <CardHeader className="py-3">
              <CardDescription>
                Proyección provisional por promedio móvil de ventas. Será reemplazada por el
                módulo predictivo (RF-22/RF-23) en la fase 4 del proyecto general, manteniendo
                este mismo formato.
              </CardDescription>
            </CardHeader>
          </Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Stock actual</TableHead>
                <TableHead className="text-right">Venta diaria prom.</TableHead>
                <TableHead className="text-right">Días de cobertura</TableHead>
                <TableHead className="text-right">Sugerencia reposición</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyeccion.map((f) => {
                const critico =
                  f.dias_cobertura !== null && f.dias_cobertura < 14;
                return (
                  <TableRow key={f.productoId}>
                    <TableCell className="font-mono text-xs">{f.codigo}</TableCell>
                    <TableCell className="font-medium">{f.nombre}</TableCell>
                    <TableCell
                      className={`text-right ${
                        f.stock_actual < f.stock_minimo ? 'font-semibold text-destructive' : ''
                      }`}
                    >
                      {formatCantidad(f.stock_actual)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCantidad(f.venta_diaria_promedio)}
                    </TableCell>
                    <TableCell className="text-right">
                      {f.dias_cobertura !== null ? (
                        <Badge variant={critico ? 'destructive' : 'secondary'}>
                          {Math.round(f.dias_cobertura)} días
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">sin ventas</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {f.sugerencia_reposicion > 0
                        ? formatCantidad(f.sugerencia_reposicion)
                        : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
