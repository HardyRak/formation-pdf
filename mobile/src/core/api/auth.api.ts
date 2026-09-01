import type { AuthSession, User } from '../models';
import { httpClient } from './http-client';

export const authApi = {
  login: (email: string, password: string) =>
    httpClient.post<AuthSession>('/auth/login', { email, password }, { anonymous: true }),
  refresh: (refreshToken: string) =>
    httpClient.post<AuthSession>('/auth/refresh', { refreshToken }, { anonymous: true }),
  me: () => httpClient.get<User>('/auth/me'),
  logout: () => httpClient.post<{ success: boolean }>('/auth/logout'),
};
