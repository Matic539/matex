// Cliente HTTP mínimo y tipado para la API Matex.
// Convención backend: éxito { data, meta? } · error { error: { code, message, details? } }

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(error.message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('matex_token'); // gestión de sesión: fase 1

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Sesión expirada o token inválido: limpiar y volver al login (RF-04)
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      localStorage.removeItem('matex_token');
      localStorage.removeItem('matex_user');
      window.location.href = '/login';
    }
    throw new ApiRequestError(
      res.status,
      body?.error ?? { code: 'UNKNOWN', message: `Error HTTP ${res.status}` },
    );
  }

  return body.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
