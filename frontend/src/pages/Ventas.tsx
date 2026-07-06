import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ventasApi, type VentaResumen } from '@/api/ventas';
import { categoriasApi, type Categoria } from '@/api/categorias';
import type { PageMeta } from '@/api/client';
import { formatCLP, formatFecha } from '@/lib/format';

const ORIGEN_LABEL: Record<VentaResumen['origen'], string> = {
  manual: 'Manual',
  vessi: 'Vessi',
  excel: 'Histórico',
};

const PAGE_SIZE = 15;

// RF-15: consulta de ventas con filtros por fecha y categoría
export function Ventas() {
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    ventasApi
      .listar({
        desde: desde || undefined,
        hasta: hasta || undefined,
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((r) => {
        setVentas(r.data);
        setMeta(r.meta);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [desde, hasta, categoriaId, page]);

  const totalPaginas = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <Link
          to="/ventas/nueva"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Nueva venta
        </Link>
      </div>

      {/* Filtros RF-15 */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="f-desde" className="text-xs text-muted-foreground">
            Desde
          </Label>
          <Input
            id="f-desde"
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-hasta" className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <Input
            id="f-hasta"
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Categoría</Label>
          <Select
            className="w-52"
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N°</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Forma de pago</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Ítems</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ventas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No hay ventas con los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            ventas.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link to={`/ventas/${v.id}`} className="font-medium hover:underline">
                    #{v.id}
                  </Link>
                </TableCell>
                <TableCell>{formatFecha(v.fecha)}</TableCell>
                <TableCell>
                  <Badge variant={v.origen === 'manual' ? 'default' : 'secondary'}>
                    {ORIGEN_LABEL[v.origen]}
                  </Badge>
                </TableCell>
                <TableCell>{v.formaPago}</TableCell>
                <TableCell>{v.usuario ?? '—'}</TableCell>
                <TableCell className="text-right">{v.nItems}</TableCell>
                <TableCell className="text-right font-medium">{formatCLP(v.total)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {meta.total} venta(s) · página {meta.page} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPaginas}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
