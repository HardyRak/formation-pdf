import type { ApiError } from '../models';
import { handleRequest, API_BASE_URL, decodeJwt } from './backend/server';

type Method = 'GET' | 'POST' | 'PATCH';

interface RequestOptions {
  body?: Record<string, unknown>;
  /** true pour les routes publiques (login / refresh). */
  anonymous?: boolean;
}

interface Interceptors {
  getAccessToken: () => string | null;
  onUnauthorized: (error: ApiError) => Promise<string | null>;
}

let interceptors: Interceptors = {
  getAccessToken: () => null,
  onUnauthorized: async () => null,
};

/** Enregistre l'intercepteur d'authentification (fait par AuthStore). */
export function configureHttpInterceptor(next: Interceptors) {
  interceptors = next;
}

export function isApiError(error: unknown): error is ApiError {
  return !!error && typeof error === 'object' && 'status' in error && 'code' in error;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return { status: 0, code: 'NETWORK_ERROR', message: 'Connexion impossible. Vérifiez votre réseau.' };
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  return !payload || payload.exp <= Date.now();
}

export interface RequestLog {
  method: Method;
  path: string;
  status: number;
  durationMs: number;
  at: number;
}

const logs: RequestLog[] = [];
export const requestLogs = () => logs.slice(0, 25);

async function execute<T>(method: Method, path: string, options: RequestOptions, token: string | null): Promise<T> {
  const started = Date.now();
  try {
    const result = await handleRequest({ method, path, body: options.body, token });
    logs.unshift({ method, path, status: 200, durationMs: Date.now() - started, at: started });
    if (logs.length > 40) logs.pop();
    return result as T;
  } catch (error) {
    const apiErr = toApiError(error);
    logs.unshift({ method, path, status: apiErr.status, durationMs: Date.now() - started, at: started });
    if (logs.length > 40) logs.pop();
    throw apiErr;
  }
}

/**
 * Client HTTP + intercepteur : ajout du Bearer, rejeu après rafraîchissement,
 * normalisation des erreurs. Équivalent de HttpInterceptorFn côté Angular.
 */
async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  void url; // trace/debug

  if (options.anonymous) {
    return execute<T>(method, path, options, null);
  }

  const token = interceptors.getAccessToken();
  try {
    return await execute<T>(method, path, options, token);
  } catch (error) {
    const apiErr = toApiError(error);
    if (apiErr.status === 401) {
      const refreshed = await interceptors.onUnauthorized(apiErr);
      if (refreshed) {
        return execute<T>(method, path, options, refreshed);
      }
    }
    throw apiErr;
  }
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
};
