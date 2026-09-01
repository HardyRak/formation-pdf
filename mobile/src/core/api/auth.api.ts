import type { AccessSummary, AuthSession, User } from '../models';
import { httpClient } from './http-client';

export const authApi = {
  login: (email: string, password: string) =>
    httpClient.post<AuthSession>('/auth/login', { email, password }, { anonymous: true }),
  refresh: (refreshToken: string) =>
    httpClient.post<AuthSession>('/auth/refresh', { refreshToken }, { anonymous: true }),
  me: () => httpClient.get<User>('/auth/me'),
  /** Résumé des droits d'accès (source serveur de `security/access`). */
  meAccess: () => httpClient.get<AccessSummary>('/auth/me/access'),
  logout: () => httpClient.post<{ success: boolean }>('/auth/logout'),
};
