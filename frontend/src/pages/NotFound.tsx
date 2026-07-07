import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <p className="text-lg font-medium">Página no encontrada</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        La ruta que intentas abrir no existe o no tienes permisos para verla.
      </p>
      <Button variant="outline" onClick={() => (window.location.href = '/')}>
        Volver al inicio
      </Button>
      <Link to="/login" className="text-xs text-muted-foreground hover:underline">
        Ir al inicio de sesión
      </Link>
    </div>
  );
}
