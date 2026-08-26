import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ventasApi, type Venta } from '@/api/ventas';
import { formatCLP, formatCantidad, formatFecha } from '@/lib/format';

// RF-16: detalle de venta con sus productos.
// RN-04: las ventas no se editan (las importadas son de solo lectura).
export function VentaDetalle() {
  const { id } = useParams();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [errorAnular, setErrorAnular] = useState<string | null>(null);

  useEffect(() => {
    ventasApi
      .obtener(Number(id))
      .then(setVenta)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  // Anulación: conserva el registro, revierte el stock (kardex) y la venta
  // sale de las métricas. Solo ventas manuales (RN-04).
  const puedeAnular = venta && venta.origen === 'manual' && venta.estado !== 'anulada';

  async function anular() {
    if (!venta) return;
    setAnulando(true);
    setErrorAnular(null);
    try {
      setVenta(await ventasApi.anular(venta.id));
      setConfirmando(false);
    } catch (e) {
      setErrorAnular(e instanceof Error ? e.message : 'Error al anular la venta');
    } finally {
      setAnulando(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/ventas" className="inline-flex items-center gap-1 text-sm hover:underline">
          <ArrowLeft className="size-4" /> Volver a ventas
        </Link>
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!venta) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <Link to="/ventas" className="inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Volver a ventas
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Venta #{venta.id}</h1>
          <p className="text-sm text-muted-foreground">
            {formatFecha(venta.fecha)} · {venta.formaPago}
            {venta.usuario ? ` · ${venta.usuario}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={venta.origen === 'manual' ? 'default' : 'secondary'}>
            {venta.origen === 'manual' ? 'Manual' : venta.origen === 'vessi' ? 'Vessi' : 'Histórico'}
          </Badge>
          <Badge variant={venta.estado === 'anulada' ? 'destructive' : 'success'}>
            {venta.estado}
          </Badge>
          {puedeAnular && (
            <Button variant="outline" size="sm" onClick={() => setConfirmando(true)}>
              <Ban className="text-destructive" />
              Anular venta
            </Button>
          )}
        </div>
      </div>

      {venta.estado === 'anulada' && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Venta anulada: el stock fue devuelto (ver kardex) y no se considera en métricas ni
          proyecciones. El registro se conserva para trazabilidad.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unitario</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venta.detalles.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.producto.codigo}</TableCell>
                  <TableCell>
                    <Link to={`/productos/${d.producto.id}`} className="hover:underline">
                      {d.producto.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCantidad(d.cantidad)} {d.producto.unidadMedida}
                  </TableCell>
                  <TableCell className="text-right">{formatCLP(d.precioUnitario)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCLP(d.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end border-t pt-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p
                className={`text-3xl font-bold ${venta.estado === 'anulada' ? 'text-muted-foreground line-through' : ''}`}
              >
                {formatCLP(venta.total)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        title={`Anular venta #${venta.id}`}
        description="El registro se conservará como anulado, el stock de los productos será devuelto (trazado en el kardex) y la venta dejará de contar en métricas y proyecciones. Esta acción no se puede deshacer."
      >
        <div className="space-y-4">
          {errorAnular && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorAnular}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={anular} disabled={anulando}>
              {anulando ? 'Anulando…' : 'Sí, anular venta'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
