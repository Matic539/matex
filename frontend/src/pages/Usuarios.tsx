import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
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
import { usuariosApi, type Usuario } from '@/api/usuarios';
import { useAuth } from '@/context/AuthContext';
import { ROLES, ROL_LABELS, type Rol } from '@/types/auth';

interface FormState {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

const formVacio: FormState = { nombre: '', email: '', password: '', rol: 'ventas' };

// RF-03: gestión de usuarios (solo administrador)
export function Usuarios() {
  const { user: sesion } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal crear/editar
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormState>(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    try {
      setUsuarios(await usuariosApi.listar());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
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

  function abrirEditar(u: Usuario) {
    setEditando(u);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol });
    setErrorForm(null);
    setAbierto(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      if (editando) {
        await usuariosApi.actualizar(editando.id, {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await usuariosApi.crear(form);
      }
      setAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleEstado(u: Usuario) {
    try {
      await usuariosApi.cambiarEstado(u.id, !u.activo);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <Button onClick={abrirCrear}>
          <Plus />
          Nuevo usuario
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
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
          ) : usuarios.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No hay usuarios registrados.
              </TableCell>
            </TableRow>
          ) : (
            usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.nombre}
                  {u.id === sesion?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                  )}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROL_LABELS[u.rol]}</TableCell>
                <TableCell>
                  <Badge variant={u.activo ? 'success' : 'destructive'}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(u)}>
                      <Pencil />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={u.id === sesion?.id}
                      onClick={() => toggleEstado(u)}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
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
        title={editando ? `Editar usuario #${editando.id}` : 'Nuevo usuario'}
        description={
          editando ? 'Deja la contraseña vacía para mantener la actual.' : undefined
        }
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-email">Email</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-password">
              Contraseña {editando && <span className="text-muted-foreground">(opcional)</span>}
            </Label>
            <Input
              id="u-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editando}
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-rol">Rol</Label>
            <Select
              id="u-rol"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROL_LABELS[r]}
                </option>
              ))}
            </Select>
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
