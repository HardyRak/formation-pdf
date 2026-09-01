import type { ApiError, AuthSession, DocumentProgress, User } from '../../models';
import { catalogDb } from './catalog';
import { FORMATION_ACCESS, LEVEL_ACCESS } from '../../security/access';
import { mergeProgressEntries, percentOf } from '../../utils/progression-merge';

/**
 * Simulation locale du backend NestJS (contrôleurs REST + JWT).
 * Utilisée uniquement en mode `EXPO_PUBLIC_API_MODE=mock`. En mode `remote`,
 * le transport HTTP réel est géré par `http-client.ts` (URL dans `config/env.ts`).
 */

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface AccountRecord {
  user: User;
  password: string;
}

const ACCOUNTS: AccountRecord[] = [
  {
    password: 'demo1234',
    user: {
      id: 'usr-1',
      email: 'sophie.martin@pdftrain.io',
      firstName: 'Sophie',
      lastName: 'Martin',
      role: 'LEARNER',
      company: 'Groupe Ardentis',
      avatarColor: '#4F46E5',
    },
  },
  {
    password: 'manager2024',
    user: {
      id: 'usr-2',
      email: 'karim.benali@pdftrain.io',
      firstName: 'Karim',
      lastName: 'Benali',
      role: 'MANAGER',
      company: 'Groupe Ardentis',
      avatarColor: '#0EA5A4',
    },
  },
];

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encodage base64 portable (web, Hermes, tests). */
function encodeBase64(input: string): string {
  const bytes = unescape(encodeURIComponent(input));
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const c1 = bytes.charCodeAt(i);
    const c2 = bytes.charCodeAt(i + 1);
    const c3 = bytes.charCodeAt(i + 2);
    output += B64_ALPHABET[c1 >> 2];
    output += B64_ALPHABET[((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4)];
    output += isNaN(c2) ? '=' : B64_ALPHABET[((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6)];
    output += isNaN(c3) ? '=' : B64_ALPHABET[c3 & 63];
  }
  return output;
}

function decodeBase64(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, '');
  let output = '';
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = B64_ALPHABET.indexOf(clean[i]);
    const e2 = B64_ALPHABET.indexOf(clean[i + 1]);
    const e3 = B64_ALPHABET.indexOf(clean[i + 2]);
    const e4 = B64_ALPHABET.indexOf(clean[i + 3]);
    output += String.fromCharCode((e1 << 2) | (e2 >> 4));
    if (e3 !== -1 && clean[i + 2] !== '=') output += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
    if (e4 !== -1 && clean[i + 3] !== '=') output += String.fromCharCode(((e3 & 3) << 6) | e4);
  }
  return decodeURIComponent(escape(output));
}

export const b64 = (value: string) => encodeBase64(value);

const unb64 = (value: string) => decodeBase64(value);

interface JwtPayload {
  sub: string;
  email: string;
  typ: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export function signJwt(sub: string, email: string, typ: 'access' | 'refresh', ttl: number): string {
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: JwtPayload = {
    sub,
    email,
    typ,
    iat: Date.now(),
    exp: Date.now() + ttl,
  };
  const body = b64(JSON.stringify(payload));
  const signature = b64(`${sub}.${typ}.${payload.exp}`).replace(/=/g, '');
  return `${header}.${body}.${signature}`;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, body] = token.split('.');
    if (!body) return null;
    return JSON.parse(unb64(body)) as JwtPayload;
  } catch {
    return null;
  }
}

export const apiError = (status: number, code: string, message: string): ApiError => ({ status, code, message });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Latence réseau simulée, légèrement variable. */
const latency = (base: number) => delay(base + Math.random() * base * 0.6);

function buildSession(record: AccountRecord): AuthSession {
  return {
    accessToken: signJwt(record.user.id, record.user.email, 'access', ACCESS_TTL_MS),
    refreshToken: signJwt(record.user.id, record.user.email, 'refresh', REFRESH_TTL_MS),
    expiresAt: Date.now() + ACCESS_TTL_MS,
    user: record.user,
  };
}

export interface BackendRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  token?: string | null;
}

function requireAuth(token?: string | null): User {
  const payload = token ? decodeJwt(token) : null;
  if (!payload || payload.typ !== 'access') {
    throw apiError(401, 'UNAUTHORIZED', 'Authentification requise.');
  }
  if (payload.exp < Date.now()) {
    throw apiError(401, 'TOKEN_EXPIRED', 'Votre session a expiré. Merci de vous reconnecter.');
  }
  const account = ACCOUNTS.find((a) => a.user.id === payload.sub);
  if (!account) throw apiError(401, 'UNAUTHORIZED', 'Compte introuvable.');
  return account.user;
}

/** Point d'entrée unique : équivalent du routeur NestJS. */
export async function handleRequest({ method, path, body, token }: BackendRequest): Promise<unknown> {
  const db = catalogDb();

  // ---- Auth ------------------------------------------------------
  if (method === 'POST' && path === '/auth/login') {
    await latency(650);
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const account = ACCOUNTS.find((a) => a.user.email === email);
    if (!account || account.password !== password) {
      throw apiError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }
    return buildSession(account);
  }

  if (method === 'POST' && path === '/auth/refresh') {
    await latency(300);
    const payload = body?.refreshToken ? decodeJwt(body.refreshToken as string) : null;
    if (!payload || payload.typ !== 'refresh' || payload.exp < Date.now()) {
      throw apiError(401, 'REFRESH_EXPIRED', 'Session expirée, reconnexion nécessaire.');
    }
    const account = ACCOUNTS.find((a) => a.user.id === payload.sub);
    if (!account) throw apiError(401, 'UNAUTHORIZED', 'Compte introuvable.');
    return buildSession(account);
  }

  if (method === 'POST' && path === '/auth/logout') {
    await latency(150);
    return { success: true };
  }

  if (method === 'GET' && path === '/auth/me') {
    await latency(200);
    return requireAuth(token);
  }

  if (method === 'GET' && path === '/auth/me/access') {
    await latency(180);
    return accessSummaryFor(requireAuth(token));
  }

  // ---- Ressources protégées -------------------------------------
  requireAuth(token);

  if (method === 'GET' && path === '/formations') {
    await latency(520);
    return db.formations;
  }

  const levelsMatch = path.match(/^\/formations\/([\w-]+)\/levels$/);
  if (method === 'GET' && levelsMatch) {
    await latency(420);
    const formationId = levelsMatch[1];
    if (!db.formations.some((f) => f.id === formationId)) {
      throw apiError(404, 'NOT_FOUND', 'Formation introuvable.');
    }
    return db.levels.filter((l) => l.formationId === formationId).sort((a, b) => a.order - b.order);
  }

  const docsMatch = path.match(/^\/levels\/([\w-]+)\/documents$/);
  if (method === 'GET' && docsMatch) {
    await latency(420);
    const levelId = docsMatch[1];
    if (!db.levels.some((l) => l.id === levelId)) {
      throw apiError(404, 'NOT_FOUND', 'Niveau introuvable.');
    }
    return db.documents.filter((doc) => doc.levelId === levelId).sort((a, b) => a.order - b.order);
  }

  const docMatch = path.match(/^\/documents\/([\w-]+)$/);
  if (method === 'GET' && docMatch) {
    await latency(260);
    const doc = db.documents.find((item) => item.id === docMatch[1]);
    if (!doc) throw apiError(404, 'NOT_FOUND', 'Document introuvable.');
    return doc;
  }

  // Flux du PDF : pages sérialisées, aucune URL publique n'est exposée.
  const streamMatch = path.match(/^\/documents\/([\w-]+)\/stream$/);
  if (method === 'GET' && streamMatch) {
    await latency(700);
    const pages = db.pages[streamMatch[1]];
    if (!pages) throw apiError(404, 'NOT_FOUND', 'Fichier introuvable.');
    return { documentId: streamMatch[1], pages };
  }

  // ---- Progression (équivalent de back/src/progression) -----------
  const user = requireAuth(token);

  if (method === 'GET' && path === '/progression') {
    await latency(300);
    return progressionDbFor(user.id).list();
  }

  const upsertMatch = path.match(/^\/progression\/documents\/([\w-]+)$/);
  if (method === 'PUT' && upsertMatch) {
    await latency(220);
    const documentId = upsertMatch[1];
    const incoming = progressionFromBody(documentId, body);
    const saved = progressionDbFor(user.id).upsert(incoming);
    return saved;
  }

  if (method === 'DELETE' && upsertMatch) {
    await latency(180);
    return { success: progressionDbFor(user.id).remove(upsertMatch[1]) };
  }

  if (method === 'DELETE' && path === '/progression') {
    await latency(200);
    return { success: true, deletedCount: progressionDbFor(user.id).clear() };
  }

  throw apiError(404, 'NOT_FOUND', `Route inconnue : ${method} ${path}`);
}

/** Simulation du résumé des droits (équivalent de GET /auth/me/access). */
function accessSummaryFor(user: User) {
  if (user.role === 'MANAGER') {
    return { role: 'MANAGER' as const, formations: ['*'], levels: {} };
  }
  const formations = FORMATION_ACCESS[user.id] ?? [];
  const levels: Record<string, string[]> = {};
  for (const formationId of formations) {
    levels[formationId] = LEVEL_ACCESS[user.id]?.[formationId] ?? [];
  }
  return { role: user.role, formations, levels };
}

export const DEMO_CREDENTIALS = {
  email: ACCOUNTS[0].user.email,
  password: ACCOUNTS[0].password,
};

// ---- Progression simulée (équivalent de la collection document_progress) ----

/**
 * Base « document_progress » en mémoire : une map par utilisateur.
 * Mêmes sémantiques de fusion que `back/src/progression/progression.service.ts`.
 */
class ProgressionMockDb {
  private entries = new Map<string, DocumentProgress>();

  list(): DocumentProgress[] {
    return Array.from(this.entries.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  upsert(incoming: DocumentProgress): DocumentProgress {
    const existing = this.entries.get(incoming.documentId);
    const saved = existing ? mergeProgressEntries(existing, incoming) : incoming;
    this.entries.set(saved.documentId, saved);
    return saved;
  }

  remove(documentId: string): boolean {
    return this.entries.delete(documentId);
  }

  clear(): number {
    const count = this.entries.size;
    this.entries.clear();
    return count;
  }
}

const progressionDatabases = new Map<string, ProgressionMockDb>();

function progressionDbFor(userId: string): ProgressionMockDb {
  let db = progressionDatabases.get(userId);
  if (!db) {
    db = new ProgressionMockDb();
    progressionDatabases.set(userId, db);
  }
  return db;
}

const asInt = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

function progressionFromBody(documentId: string, body?: Record<string, unknown>): DocumentProgress {
  const pageCount = Math.max(1, asInt(body?.pageCount, 1));
  const pagesRead = Array.isArray(body?.pagesRead)
    ? (body?.pagesRead as unknown[]).map((p) => asInt(p, 0)).filter((p) => p >= 1 && p <= pageCount)
    : [];
  const unique = Array.from(new Set(pagesRead)).sort((a, b) => a - b);
  const lastPage = Math.min(Math.max(asInt(body?.lastPage, 1), 1), pageCount);
  return {
    documentId,
    levelId: String(body?.levelId ?? ''),
    formationId: String(body?.formationId ?? ''),
    lastPage,
    pageCount,
    pagesRead: unique,
    percent: percentOf(unique.length, pageCount),
    completed: unique.length >= pageCount,
    updatedAt: asInt(body?.updatedAt, Date.now()),
  };
}
