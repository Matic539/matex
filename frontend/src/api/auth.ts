import { api } from './client';
import type { AuthUser } from '@/types/auth';

export interface LoginResult {
  token: string;
  usuario: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResult>('/auth/login', { email, password }),
  me: () => api.get<AuthUser>('/auth/me'),
};
