import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { productosApi, type Producto } from '@/api/productos';
import { formatCantidad } from '@/lib/format';
import { cn } from '@/lib/utils';

// Buscador de productos con lista desplegable (usado en inventario y ventas)
export function ProductoPicker({
  onSelect,
  placeholder = 'Buscar producto por nombre o código…',
  className,
}: {
  onSelect: (p: Producto) => void;
  placeholder?: string;
  className?: string;
}) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Búsqueda con debounce
  useEffect(() => {
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      productosApi
        .listar({ buscar: texto.trim(), pageSize: 8 })
        .then((r) => {
          setResultados(r.data);
          setAbierto(true);
        })
        .catch(() => setResultados([]));
    }, 250);
    return () => clearTimeout(t);
  }, [texto]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={contenedor} className={cn('relative', className)}>
      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input
        className="pl-8"
        placeholder={placeholder}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => resultados.length > 0 && setAbierto(true)}
      />
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onSelect(p);
                  setTexto('');
                  setAbierto(false);
                }}
              >
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>{' '}
                  {p.nombre}
                </span>
                <span
                  className={cn(
                    'shrink-0 text-xs',
                    p.bajoMinimo ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  stock {formatCantidad(p.stockActual)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
