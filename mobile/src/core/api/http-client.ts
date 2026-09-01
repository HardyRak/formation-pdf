import type { ApiError } from '../models';
import { API_BASE_URL, API_MODE } from '../config/env';
import { decodeJwt } from './jwt';
import { handleRequest } from './backend/server';

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

/**
 * Vérifie l'expiration d'un jeton JWT.
 * La claim `exp` est en SECONDES (JWT standard signé par le backend NestJS).
 * Le mock historique utilisait des millisecondes : on normalise les deux formats.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const expMs = payload.exp < 1e12 ? payload.exp * 1000 : payload.exp;
  return expMs <= Date.now();
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

function record(method: Method, path: string, status: number, durationMs: number) {
  logs.unshift({ method, path, status, durationMs, at: Date.now() });
  if (logs.length > 40) logs.pop();
}

/** Transport réel : requête HTTP vers l'API NestJS (back/). */
async function remoteRequest<T>(
  method: Method,
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isApiError(data)) throw data;
    throw {
      status: response.status,
      code: 'HTTP_ERROR',
      message: `Erreur HTTP ${response.status}`,
    } satisfies ApiError;
  }
  return data as T;
}

async function execute<T>(
  method: Method,
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<T> {
  const started = Date.now();
  try {
    const result =
      API_MODE === 'mock'
        ? await handleRequest({ method, path, body: options.body, token })
        : await remoteRequest<T>(method, path, options, token);
    record(method, path, 200, Date.now() - started);
    return result as T;
  } catch (error) {
    const apiErr = toApiError(error);
    record(method, path, apiErr.status, Date.now() - started);
    throw apiErr;
  }
}

/**
 * Client HTTP + intercepteur : ajout du Bearer, rejeu après rafraîchissement,
 * normalisation des erreurs. Équivalent de HttpInterceptorFn côté Angular.
 */
async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
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
