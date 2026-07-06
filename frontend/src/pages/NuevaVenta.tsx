import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ventasApi, type FormaPago } from '@/api/ventas';
import type { Producto } from '@/api/productos';
import { formatCLP, formatCantidad } from '@/lib/format';

interface Linea {
  producto: Producto;
  cantidad: string;
  precioUnitario: string; // editable; por defecto el precio vigente bruto
}

// RF-13: registro de venta manual multiproducto (cantidad y precio editables)
export function NuevaVenta() {
  const navigate = useNavigate();
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [formaPagoId, setFormaPagoId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ventasApi
      .formasPago()
      .then((f) => {
        setFormasPago(f);
        if (f[0]) setFormaPagoId(String(f[0].id));
      })
      .catch(() => setFormasPago([]));
  }, []);

  function agregarProducto(p: Producto) {
    // Si ya está, incrementar cantidad
    const idx = lineas.findIndex((l) => l.producto.id === p.id);
    if (idx >= 0) {
      actualizarLinea(idx, { cantidad: String(Number(lineas[idx]!.cantidad || 0) + 1) });
      return;
    }
    setLineas([
      ...lineas,
      {
        producto: p,
        cantidad: '1',
        precioUnitario: p.precioVigente ? String(p.precioVigente.bruto) : '',
      },
    ]);
  }

  function actualizarLinea(idx: number, cambios: Partial<Pick<Linea, 'cantidad' | 'precioUnitario'>>) {
    setLineas(lineas.map((l, i) => (i === idx ? { ...l, ...cambios } : l)));
  }

  function quitarLinea(idx: number) {
    setLineas(lineas.filter((_, i) => i !== idx));
  }

  const total = useMemo(
    () =>
      lineas.reduce((acc, l) => {
        const c = Number(l.cantidad) || 0;
        const p = Number(l.precioUnitario) || 0;
        return acc + Math.round(c * p * 100) / 100;
      }, 0),
    [lineas],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lineas.length === 0) {
      setError('Agrega al menos un producto a la venta');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const venta = await ventasApi.crear(
        Number(formaPagoId),
        lineas.map((l) => ({
          productoId: l.producto.id,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precioUnitario),
        })),
      );
      navigate(`/ventas/${venta.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la venta');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/ventas" className="inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Volver a ventas
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nueva venta</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>
              Busca y agrega productos. Cantidad y precio unitario son editables; el precio
              propuesto es el vigente. La venta descuenta stock automáticamente (RN-01).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProductoPicker className="max-w-md" onSelect={agregarProducto} />

            {lineas.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-32">Cantidad</TableHead>
                    <TableHead className="w-40">Precio unitario</TableHead>
                    <TableHead className="w-32 text-right">Subtotal</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.map((l, idx) => {
                    const subtotal =
                      Math.round((Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0) * 100) /
                      100;
                    const excedeStock = (Number(l.cantidad) || 0) > l.producto.stockActual;
                    return (
                      <TableRow key={l.producto.id}>
                        <TableCell>
                          <p className="font-medium">{l.producto.nombre}</p>
                          <p className={`text-xs ${excedeStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                            Stock disponible: {formatCantidad(l.producto.stockActual)}{' '}
                            {l.producto.unidadMedida}
                            {excedeStock && ' — insuficiente'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={l.cantidad}
                            onChange={(e) => actualizarLinea(idx, { cantidad: e.target.value })}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={l.precioUnitario}
                            onChange={(e) => actualizarLinea(idx, { precioUnitario: e.target.value })}
                            required
                            placeholder="CLP"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCLP(subtotal)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => quitarLinea(idx)}
                            aria-label="Quitar línea"
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-end justify-between gap-4 pt-6">
            <div className="w-56 space-y-2">
              <Label htmlFor="v-fp">Forma de pago</Label>
              <Select
                id="v-fp"
                value={formaPagoId}
                onChange={(e) => setFormaPagoId(e.target.value)}
                required
              >
                {formasPago.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold">{formatCLP(total)}</p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/ventas')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando || lineas.length === 0}>
            {guardando ? 'Registrando…' : 'Registrar venta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
