import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/api/auth';
import type { AuthUser } from '@/types/auth';

const TOKEN_KEY = 'matex_token';
const USER_KEY = 'matex_user';
// RF-04: expiración por inactividad (30 min sin interacción)
const INACTIVITY_MS = 30 * 60 * 1000;

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    // Redirección dura: limpia todo estado en memoria
    window.location.href = '/login';
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, usuario } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
    setUser(usuario);
  }, []);

  // Temporizador de inactividad: cualquier interacción lo reinicia (RF-04)
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, INACTIVITY_MS);
    };

    const eventos = ['click', 'keydown', 'scroll', 'mousemove'] as const;
    eventos.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      eventos.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, logout]);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
