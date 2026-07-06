import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { productosApi, type Producto } from '@/api/productos';
import { categoriasApi, type Categoria } from '@/api/categorias';
import { useAuth } from '@/context/AuthContext';
import { formatCLP, formatCantidad } from '@/lib/format';
import type { PageMeta } from '@/api/client';

interface FormState {
  codigo: string;
  nombre: string;
  categoriaId: string;
  unidadMedida: string;
  dimensiones: string;
  stockMinimo: string;
  precioNeto: string;
}

const formVacio: FormState = {
  codigo: '',
  nombre: '',
  categoriaId: '',
  unidadMedida: 'unidad',
  dimensiones: '',
  stockMinimo: '0',
  precioNeto: '',
};

const PAGE_SIZE = 15;

// RF-05 (CRUD), RF-08 (búsqueda/filtros), RN-06 (indicador bajo mínimo)
export function Productos() {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';

  const [productos, setProductos] = useState<Producto[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros (RF-08)
  const [buscar, setBuscar] = useState('');
  const [buscarDebounced, setBuscarDebounced] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [page, setPage] = useState(1);

  // Modal crear/editar (solo admin)
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState<FormState>(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Debounce de búsqueda (300 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscarDebounced(buscar);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [buscar]);

  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]));
  }, []);

  async function cargar() {
    setCargando(true);
    try {
      const res = await productosApi.listar({
        buscar: buscarDebounced || undefined,
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setProductos(res.data);
      setMeta(res.meta);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar productos');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscarDebounced, categoriaId, page]);

  const totalPaginas = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;

  function abrirCrear() {
    setEditando(null);
    setForm({ ...formVacio, categoriaId: categorias[0] ? String(categorias[0].id) : '' });
    setErrorForm(null);
    setAbierto(true);
  }

  function abrirEditar(p: Producto) {
    setEditando(p);
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      categoriaId: String(p.categoria.id),
      unidadMedida: p.unidadMedida,
      dimensiones: p.dimensiones ?? '',
      stockMinimo: String(p.stockMinimo),
      precioNeto: '',
    });
    setErrorForm(null);
    setAbierto(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      const base = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        categoriaId: Number(form.categoriaId),
        unidadMedida: form.unidadMedida.trim(),
        dimensiones: form.dimensiones.trim() || undefined,
        stockMinimo: Number(form.stockMinimo) || 0,
      };
      if (editando) {
        await productosApi.actualizar(editando.id, base);
      } else {
        await productosApi.crear({
          ...base,
          precioNeto: form.precioNeto ? Number(form.precioNeto) : undefined,
        });
      }
      setAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        {esAdmin && (
          <Button onClick={abrirCrear}>
            <Plus />
            Nuevo producto
          </Button>
        )}
      </div>

      {/* Filtros RF-08 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nombre o código…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
        <Select
          className="w-56"
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead className="text-right">Precio (bruto)</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Estado</TableHead>
            {esAdmin && <TableHead className="w-24">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                Cargando…
              </TableCell>
            </TableRow>
          ) : productos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                No se encontraron productos con los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            productos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                <TableCell className="font-medium">
                  <Link to={`/productos/${p.id}`} className="hover:underline">
                    {p.nombre}
                  </Link>
                </TableCell>
                <TableCell>{p.categoria.nombre}</TableCell>
                <TableCell>{p.unidadMedida}</TableCell>
                <TableCell className="text-right">
                  {p.precioVigente ? formatCLP(p.precioVigente.bruto) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1">
                    {p.bajoMinimo && <AlertTriangle className="size-3.5 text-destructive" />}
                    <span className={p.bajoMinimo ? 'font-semibold text-destructive' : ''}>
                      {formatCantidad(p.stockActual)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / mín {formatCantidad(p.stockMinimo)}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.activo ? 'success' : 'destructive'}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                {esAdmin && (
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(p)}>
                      <Pencil />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Paginación */}
      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {meta.total} producto(s) · página {meta.page} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
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
        title={editando ? `Editar producto ${editando.codigo}` : 'Nuevo producto'}
        description={editando ? undefined : 'El precio se puede definir ahora o más adelante.'}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-codigo">Código</Label>
              <Input
                id="p-codigo"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                required
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-unidad">Unidad de medida</Label>
              <Input
                id="p-unidad"
                value={form.unidadMedida}
                onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
                required
                maxLength={20}
                placeholder="unidad, m2, caja…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-nombre">Nombre</Label>
            <Input
              id="p-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              minLength={2}
              maxLength={120}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-categoria">Categoría</Label>
              <Select
                id="p-categoria"
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Seleccionar…
                </option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-dimensiones">Dimensiones (opcional)</Label>
              <Input
                id="p-dimensiones"
                value={form.dimensiones}
                onChange={(e) => setForm({ ...form, dimensiones: e.target.value })}
                maxLength={60}
                placeholder="60x60, 1.2m…"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-stockmin">Stock mínimo</Label>
              <Input
                id="p-stockmin"
                type="number"
                min="0"
                step="0.01"
                value={form.stockMinimo}
                onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                required
              />
            </div>
            {!editando && (
              <div className="space-y-2">
                <Label htmlFor="p-precio">Precio neto inicial (opcional)</Label>
                <Input
                  id="p-precio"
                  type="number"
                  min="1"
                  step="1"
                  value={form.precioNeto}
                  onChange={(e) => setForm({ ...form, precioNeto: e.target.value })}
                  placeholder="CLP sin IVA"
                />
              </div>
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
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
