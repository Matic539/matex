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
import { proveedoresApi, type Proveedor } from '@/api/proveedores';

interface FormState {
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
}

const formVacio: FormState = { nombre: '', contacto: '', telefono: '', email: '' };

// RF-18: gestión de proveedores (admin y bodega)
export function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<FormState>(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    try {
      setProveedores(await proveedoresApi.listar(true));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar proveedores');
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

  function abrirEditar(p: Proveedor) {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      contacto: p.contacto ?? '',
      telefono: p.telefono ?? '',
      email: p.email ?? '',
    });
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
        contacto: form.contacto.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
      };
      if (editando) await proveedoresApi.actualizar(editando.id, input);
      else await proveedoresApi.crear(input);
      setAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleEstado(p: Proveedor) {
    try {
      await proveedoresApi.cambiarEstado(p.id, !p.activo);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
        <Button onClick={abrirCrear}>
          <Plus />
          Nuevo proveedor
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-40">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                Cargando…
              </TableCell>
            </TableRow>
          ) : proveedores.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No hay proveedores registrados.
              </TableCell>
            </TableRow>
          ) : (
            proveedores.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{p.contacto ?? '—'}</TableCell>
                <TableCell>{p.telefono ?? '—'}</TableCell>
                <TableCell>{p.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={p.activo ? 'success' : 'destructive'}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(p)}>
                      <Pencil />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleEstado(p)}>
                      {p.activo ? 'Desactivar' : 'Activar'}
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
        title={editando ? 'Editar proveedor' : 'Nuevo proveedor'}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="pr-nombre">Nombre</Label>
            <Input
              id="pr-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              minLength={2}
              maxLength={150}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pr-contacto">Contacto (opcional)</Label>
              <Input
                id="pr-contacto"
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-telefono">Teléfono (opcional)</Label>
              <Input
                id="pr-telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                maxLength={30}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pr-email">Email (opcional)</Label>
            <Input
              id="pr-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={150}
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
