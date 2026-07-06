import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { categoriasApi, type Categoria } from '@/api/categorias';

interface FormState {
  nombre: string;
  descripcion: string;
}

const formVacio: FormState = { nombre: '', descripcion: '' };

// RF-06: gestión de categorías (solo admin, la ruta ya lo garantiza)
export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [form, setForm] = useState<FormState>(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    try {
      setCategorias(await categoriasApi.listar(true));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar categorías');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  function abrirCrear() {
    setEditando(null);
    setForm(formVacio);
    setErrorForm(null);
    setAbierto(true);
  }

  function abrirEditar(c: Categoria) {
    setEditando(c);
    setForm({ nombre: c.nombre, descripcion: c.descripcion ?? '' });
    setErrorForm(null);
    setAbierto(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      const input = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
      };
      if (editando) await categoriasApi.actualizar(editando.id, input);
      else await categoriasApi.crear(input);
      setAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleEstado(c: Categoria) {
    try {
      await categoriasApi.cambiarEstado(c.id, !c.activo);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
        <Button onClick={abrirCrear}>
          <Plus />
          Nueva categoría
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Productos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-40">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Cargando…
              </TableCell>
            </TableRow>
          ) : categorias.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No hay categorías registradas.
              </TableCell>
            </TableRow>
          ) : (
            categorias.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {c.descripcion ?? '—'}
                </TableCell>
                <TableCell className="text-right">{c.totalProductos ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={c.activo ? 'success' : 'destructive'}>
                    {c.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(c)}>
                      <Pencil />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleEstado(c)}>
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog
        open={abierto}
        onClose={() => setAbierto(false)}
        title={editando ? `Editar categoría` : 'Nueva categoría'}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="c-nombre">Nombre</Label>
            <Input
              id="c-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              minLength={2}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-descripcion">Descripción (opcional)</Label>
            <Input
              id="c-descripcion"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              maxLength={500}
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
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
