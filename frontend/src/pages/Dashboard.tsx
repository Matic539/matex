import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api/client';

interface HealthData {
  status: string;
  database: string;
  timestamp: string;
  version: string;
}

// Fase 0: verificación de conectividad end-to-end (frontend → API → BD).
// En fase 4 esta página se reemplaza por el dashboard real (RF-28).
export function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<HealthData>('/health')
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estado de la API
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <p className="text-2xl font-bold text-green-600">● {health.status}</p>
            ) : error ? (
              <p className="text-sm text-destructive">Sin conexión: {error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Verificando…</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Base de datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{health ? `● ${health.database}` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Versión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{health?.version ?? '—'}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Prototipo Sistema Matex — Fase 0</CardTitle>
          <CardDescription>
            Fundaciones listas. Los indicadores y gráficos del dashboard (RF-28) se implementan en
            la fase 4 sobre el esquema analytics.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
