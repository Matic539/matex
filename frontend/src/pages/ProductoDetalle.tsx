import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { productosApi, type PrecioHistorial, type Producto } from '@/api/productos';
import { inventarioApi, type Movimiento } from '@/api/inventario';
import { useAuth } from '@/context/AuthContext';
import { formatCLP, formatCantidad, formatFecha } from '@/lib/format';

// Ficha de producto: datos, precio vigente e historial (RF-05, RF-07).
// El kardex (RF-12) se agrega en fase 3.
export function ProductoDetalle() {
  const { id } = useParams();
  const productoId = Number(id);
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';

  const puedeVerKardex = user?.rol === 'admin' || user?.rol === 'inventario';

  const [producto, setProducto] = useState<Producto | null>(null);
  const [precios, setPrecios] = useState<PrecioHistorial[]>([]);
  const [kardex, setKardex] = useState<Movimiento[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal nuevo precio
  const [abierto, setAbierto] = useState(false);
  const [precioNeto, setPrecioNeto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    try {
      const [p, h] = await Promise.all([
        productosApi.obtener(productoId),
        productosApi.historialPrecios(productoId),
      ]);
      setProducto(p);
      setPrecios(h);
      if (puedeVerKardex) {
        const k = await inventarioApi.movimientos({ productoId, pageSize: 20 });
        setKardex(k.data);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el producto');
    }
  }

  useEffect(() => {
    if (!Number.isNaN(productoId)) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  async function onNuevoPrecio(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      await productosApi.nuevoPrecio(productoId, Number(precioNeto));
      setAbierto(false);
      setPrecioNeto('');
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al guardar el precio');
    } finally {
      setGuardando(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/productos" className="inline-flex items-center gap-1 text-sm hover:underline">
          <ArrowLeft className="size-4" /> Volver a productos
        </Link>
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!producto) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <Link to="/productos" className="inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Volver a productos
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{producto.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            Código <span className="font-mono">{producto.codigo}</span> ·{' '}
            {producto.categoria.nombre}
          </p>
        </div>
        <Badge variant={producto.activo ? 'success' : 'destructive'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Precio vigente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {producto.precioVigente ? (
              <>
                <p className="text-2xl font-bold">{formatCLP(producto.precioVigente.bruto)}</p>
                <p className="text-xs text-muted-foreground">
                  Neto: {formatCLP(producto.precioVigente.neto)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin precio definido</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`flex items-center gap-2 text-2xl font-bold ${
                producto.bajoMinimo ? 'text-destructive' : ''
              }`}
            >
              {producto.bajoMinimo && <AlertTriangle className="size-5" />}
              {formatCantidad(producto.stockActual)}
              <span className="text-sm font-normal text-muted-foreground">
                {producto.unidadMedida}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Mínimo: {formatCantidad(producto.stockMinimo)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dimensiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{producto.dimensiones ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Historial de precios</CardTitle>
            <CardDescription>RF-07 — cambios de precio con vigencias</CardDescription>
          </div>
          {esAdmin && (
            <Button size="sm" onClick={() => setAbierto(true)}>
              <Plus />
              Nuevo precio
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {precios.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Este producto aún no tiene precios registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigente desde</TableHead>
                  <TableHead>Vigente hasta</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Bruto (IVA inc.)</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {precios.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatFecha(p.vigenteDesde)}</TableCell>
                    <TableCell>{p.vigenteHasta ? formatFecha(p.vigenteHasta) : '—'}</TableCell>
                    <TableCell className="text-right">{formatCLP(p.precioNeto)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCLP(p.precioBruto)}
                    </TableCell>
                    <TableCell>
                      {p.vigente ? (
                        <Badge variant="success">Vigente</Badge>
                      ) : (
                        <Badge variant="secondary">Histórico</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {puedeVerKardex && (
        <Card>
          <CardHeader>
            <CardTitle>Kardex de movimientos</CardTitle>
            <CardDescription>RF-12 — últimos 20 movimientos de este producto</CardDescription>
          </CardHeader>
          <CardContent>
            {kardex.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sin movimientos registrados.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kardex.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatFecha(m.fecha)}</TableCell>
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
                          {m.tipo === 'entrada'
                            ? 'Entrada'
                            : m.tipo === 'salida_venta'
                              ? 'Salida por venta'
                              : 'Ajuste'}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          m.cantidad < 0 ? 'text-destructive' : 'text-green-700'
                        }`}
                      >
                        {m.cantidad > 0 ? '+' : ''}
                        {formatCantidad(m.cantidad)}
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Nuevo precio"
        description="El precio bruto se calcula con IVA 19%. El precio anterior queda como histórico."
      >
        <form className="space-y-4" onSubmit={onNuevoPrecio}>
          <div className="space-y-2">
            <Label htmlFor="np-neto">Precio neto (CLP, sin IVA)</Label>
            <Input
              id="np-neto"
              type="number"
              min="1"
              step="1"
              value={precioNeto}
              onChange={(e) => setPrecioNeto(e.target.value)}
              required
              autoFocus
            />
            {precioNeto && (
              <p className="text-xs text-muted-foreground">
                Bruto estimado: {formatCLP(Math.round(Number(precioNeto) * 1.19))}
              </p>
            )}
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
              {guardando ? 'Guardando…' : 'Guardar precio'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
