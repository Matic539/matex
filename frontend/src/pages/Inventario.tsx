import { useEffect, useState, type FormEvent } from 'react';
import { Plus, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
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
import { ProductoPicker } from '@/components/ProductoPicker';
import { inventarioApi, type AlertaStock, type Movimiento } from '@/api/inventario';
import { proveedoresApi, type Proveedor } from '@/api/proveedores';
import type { Producto } from '@/api/productos';
import type { PageMeta } from '@/api/client';
import { formatCantidad, formatFecha } from '@/lib/format';

const TIPO_LABEL: Record<Movimiento['tipo'], string> = {
  entrada: 'Entrada',
  salida_venta: 'Salida por venta',
  ajuste: 'Ajuste',
};

const PAGE_SIZE = 15;

// RF-09 (movimientos), RF-11 (alertas), RF-12 (kardex general), RN-02
export function Inventario() {
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [tipo, setTipo] = useState('');
  const [productoFiltro, setProductoFiltro] = useState<Producto | null>(null);
  const [page, setPage] = useState(1);

  // Modal nuevo movimiento
  const [abierto, setAbierto] = useState(false);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [tipoMov, setTipoMov] = useState<'entrada' | 'ajuste'>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    try {
      const [a, m] = await Promise.all([
        inventarioApi.alertas(),
        inventarioApi.movimientos({
          tipo: tipo || undefined,
          productoId: productoFiltro?.id,
          page,
          pageSize: PAGE_SIZE,
        }),
      ]);
      setAlertas(a);
      setMovimientos(m.data);
      setMeta(m.meta);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar inventario');
    }
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, productoFiltro, page]);

  useEffect(() => {
    proveedoresApi.listar().then(setProveedores).catch(() => setProveedores([]));
  }, []);

  const totalPaginas = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;

  function abrirModal() {
    setProducto(null);
    setTipoMov('entrada');
    setCantidad('');
    setProveedorId('');
    setObservacion('');
    setErrorForm(null);
    setAbierto(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!producto) {
      setErrorForm('Selecciona un producto');
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      await inventarioApi.crearMovimiento({
        productoId: producto.id,
        tipo: tipoMov,
        cantidad: Number(cantidad),
        proveedorId: proveedorId ? Number(proveedorId) : undefined,
        observacion: observacion.trim() || undefined,
      });
      setAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al registrar movimiento');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
        <Button onClick={abrirModal}>
          <Plus />
          Nuevo movimiento
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Alertas de reposición (RF-11, RN-06) */}
      <Card className={alertas.length > 0 ? 'border-destructive/50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              className={`size-5 ${alertas.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            />
            Alertas de reposición
          </CardTitle>
          <CardDescription>
            {alertas.length === 0
              ? 'Ningún producto bajo el stock mínimo.'
              : `${alertas.length} producto(s) bajo el stock mínimo.`}
          </CardDescription>
        </CardHeader>
        {alertas.length > 0 && (
          <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {alertas.map((a) => (
              <Link
                key={a.id}
                to={`/productos/${a.id}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="truncate">
                  <span className="font-mono text-xs text-muted-foreground">{a.codigo}</span>{' '}
                  {a.nombre}
                </span>
                <span className="ml-2 shrink-0 font-semibold text-destructive">
                  {formatCantidad(a.stockActual)} / {formatCantidad(a.stockMinimo)}
                </span>
              </Link>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Kardex general (RF-12) */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-48"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los tipos</option>
          <option value="entrada">Entradas</option>
          <option value="salida_venta">Salidas por venta</option>
          <option value="ajuste">Ajustes</option>
        </Select>
        <ProductoPicker
          className="w-80"
          placeholder="Filtrar por producto…"
          onSelect={(p) => {
            setProductoFiltro(p);
            setPage(1);
          }}
        />
        {productoFiltro && (
          <Badge variant="outline" className="gap-1">
            {productoFiltro.nombre}
            <button
              className="ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => setProductoFiltro(null)}
            >
              ✕
            </button>
          </Badge>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Usuario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimientos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No hay movimientos con los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap">{formatFecha(m.fecha)}</TableCell>
                <TableCell>
                  <Link to={`/productos/${m.producto.id}`} className="hover:underline">
                    {m.producto.nombre}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      m.tipo === 'entrada'
                        ? 'success'
                        : m.tipo === 'salida_venta'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {TIPO_LABEL[m.tipo]}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${m.cantidad < 0 ? 'text-destructive' : 'text-green-700'}`}
                >
                  {m.cantidad > 0 ? '+' : ''}
                  {formatCantidad(m.cantidad)} {m.producto.unidadMedida}
                </TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">
                  {m.ventaId ? (
                    <Link to={`/ventas/${m.ventaId}`} className="hover:underline">
                      Venta #{m.ventaId}
                    </Link>
                  ) : (
                    (m.proveedor?.nombre ?? m.observacion ?? '—')
                  )}
                </TableCell>
                <TableCell>{m.usuario?.nombre ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {meta.total} movimiento(s) · página {meta.page} de {totalPaginas}
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

      <Dialog
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Nuevo movimiento de stock"
        description="Entrada: recepción de mercadería. Ajuste: corrección manual del stock (positiva o negativa, requiere observación si es negativa)."
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Producto</Label>
            {producto ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{producto.codigo}</span>{' '}
                  {producto.nombre}
                  <span className="ml-2 text-xs text-muted-foreground">
                    (stock {formatCantidad(producto.stockActual)})
                  </span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setProducto(null)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <ProductoPicker onSelect={setProducto} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-tipo">Tipo</Label>
              <Select
                id="m-tipo"
                value={tipoMov}
                onChange={(e) => setTipoMov(e.target.value as 'entrada' | 'ajuste')}
              >
                <option value="entrada">Entrada</option>
                <option value="ajuste">Ajuste (+/-)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-cantidad">Cantidad</Label>
              <Input
                id="m-cantidad"
                type="number"
                step="any"
                min={tipoMov === 'entrada' ? '0' : undefined}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
                placeholder={tipoMov === 'ajuste' ? 'Ej: -5 o 12' : 'Ej: 50'}
              />
            </div>
          </div>
          {tipoMov === 'entrada' && (
            <div className="space-y-2">
              <Label htmlFor="m-proveedor">Proveedor (opcional)</Label>
              <Select
                id="m-proveedor"
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
              >
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="m-obs">
              Observación{' '}
              {tipoMov === 'ajuste' && Number(cantidad) < 0 ? (
                <span className="text-destructive">(obligatoria, RN-02)</span>
              ) : (
                <span className="text-muted-foreground">(opcional)</span>
              )}
            </Label>
            <Input
              id="m-obs"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              maxLength={500}
              required={tipoMov === 'ajuste' && Number(cantidad) < 0}
              placeholder="Motivo del movimiento…"
            />
          </div>
          {errorForm && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorForm}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Registrando…' : 'Registrar movimiento'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
