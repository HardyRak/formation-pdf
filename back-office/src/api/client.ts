/**
 * Client HTTP du back-office.
 *
 * - Toutes les routes sont relatives (`/v1/...`) : en dev le proxy Vite
 *   redirige, en prod le même hôte sert l'API (ou un reverse proxy).
 * - Ajoute automatiquement le `Authorization: Bearer` et rejoue la requête
 *   une fois après un refresh du jeton en cas de 401.
 * - Les erreurs sont normalisées au format `{ status, code, message }`.
 */
import type { ApiError, UserDto } from './types';

const API_PREFIX = '/v1';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user?: UserDto;
}

const SESSION_KEY = 'pdftrain.bo.session';

// Valeurs hors module pour éviter les imports circulaires avec le store.
let getAccessToken: () => string | null = () => null;
let onUnauthorized: (error: ApiError) => Promise<string | null> = async () => null;

/** Registre les intercepteurs (appelé par le store de session au bootstrap). */
export function configureHttpClient(next: {
  getAccessToken: () => string | null;
  onUnauthorized: (error: ApiError) => Promise<string | null>;
}): void {
  getAccessToken = next.getAccessToken;
  onUnauthorized = next.onUnauthorized;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'code' in value
  );
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return { status: 0, code: 'NETWORK_ERROR', message: 'Connexion au serveur impossible.' };
}

async function rawRequest<T>(
  method: string,
  path: string,
  options: { body?: unknown; anonymous?: boolean; isForm?: boolean },
  token: string | null,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (!options.isForm) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      method,
      headers,
      body:
        options.isForm && options.body instanceof FormData
          ? options.body
          : options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
    });
  } catch {
    throw { status: 0, code: 'NETWORK_ERROR', message: 'Connexion au serveur impossible.' } satisfies ApiError;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = /json/.test(contentType);
  const data: unknown = isJson ? await response.json().catch(() => null) : await response.text();

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

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; anonymous?: boolean; isForm?: boolean } = {},
): Promise<T> {
  const token = options.anonymous ? null : getAccessToken();
  try {
    return await rawRequest<T>(method, path, options, token);
  } catch (error) {
    const apiErr = toApiError(error);
    // Un 401 sur une route authentifiée : on rafraîchit le jeton et on rejoue.
    if (!options.anonymous && apiErr.status === 401) {
      const refreshed = await onUnauthorized(apiErr);
      if (refreshed) {
        return rawRequest<T>(method, path, options, refreshed);
      }
    }
    throw apiErr;
  }
}

/** Binaire (upload / download de PDF) — renvoie un Blob. */
export async function requestBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_PREFIX}${path}`, { method: 'GET', headers });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    if (isApiError(data)) throw data;
    throw { status: res.status, code: 'HTTP_ERROR', message: `Erreur HTTP ${res.status}` } satisfies ApiError;
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, options?: { anonymous?: boolean }) =>
    request<T>('POST', path, { body, ...options }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  postForm: <T>(path: string, form: FormData) =>
    request<T>('POST', path, { body: form, isForm: true }),
  putForm: <T>(path: string, form: FormData) =>
    request<T>('PUT', path, { body: form, isForm: true }),
  blob: (path: string) => requestBlob(path),
};

export { API_PREFIX, SESSION_KEY };
export type { StoredSession };
