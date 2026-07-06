import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Página provisional para módulos aún no implementados.
export function Placeholder({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Módulo en construcción</CardTitle>
          <CardDescription>Planificado para la {fase} del prototipo (PDP-01).</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta sección estará disponible al completar la fase correspondiente del plan de
          desarrollo.
        </CardContent>
      </Card>
    </div>
  );
}
