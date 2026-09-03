import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Utilisateur authentifié ayant émis la requête (extrait du JWT par les guards). */
export interface LogUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Détails enrichis d'une erreur survenue lors du traitement d'une requête HTTP.
 * Permet un diagnostic rapide et précis depuis la console ou via GET /logs.
 */
export interface LogErrorDetails {
  /** Nom/type de l'erreur (ex: TypeError, MongoServerError, ApiException, BadRequestException). */
  name: string;
  /** Message d'erreur détaillé (message d'origine de l'exception ou du validateur). */
  message: string;
  /** Code d'erreur applicatif ou statut (ex: INTERNAL, INVALID, NOT_FOUND, CONFLICT). */
  code?: string;
  /** Code de statut HTTP associé. */
  status?: number;
  /** Trace d'exécution complète (stack trace) pour localiser la source exacte de l'erreur. */
  stack?: string;
  /** Données contextuelles ou détails supplémentaires (ex: contraintes de validation, erreurs Mongo). */
  details?: unknown;
  /** Cause sous-jacente de l'erreur si disponible. */
  cause?: unknown;
}

/**
 * Entrée de journal pour une requête HTTP entrante.
 * Les champs sensibles (en-têtes, corps, paramètres) sont déjà masqués en amont
 * par `mask.util.ts`.
 */
export interface LogEntry {
  /** Horodatage ISO 8601 de la fin de requête. */
  timestamp: string;
  method: string;
  /** Chemin + query string (jetons/identifiants masqués). */
  url: string;
  /** Chemin de la route sans la query string. */
  path?: string;
  statusCode: number;
  durationMs: number;
  /** Adresse IP du client (derrière reverse proxy si présent). */
  ip: string;
  userAgent: string;
  /** Utilisateur authentifié, `null` si la route est publique. */
  user: LogUser | null;
  /** Paramètres de requête (query string) masqués. */
  queryParams?: Record<string, unknown>;
  /** Paramètres de route (URL params /:id) masqués. */
  params?: Record<string, unknown>;
  requestHeaders: Record<string, unknown>;
  responseHeaders: Record<string, unknown>;
  requestBody: unknown;
  /** Détails d'erreur enrichis en cas d'échec (4xx / 5xx / exceptions). */
  error?: LogErrorDetails | null;
  /** Résumé lisible : « POST /v1/admin/levels/l-ang-2/documents → 500 (30 ms) ». */
  message: string;
}

/**
 * Tampon en mémoire des dernières requêtes HTTP.
 * Servi par `GET /logs` (back-office) et consultable en cas de diagnostic.
 * Chaque requête est ÉGALEMENT écrite dans la sortie standard (voir
 * `LogCaptureMiddleware`) : ce tampon n'est qu'une vue récente, pas le
 * journal durable.
 */
@Injectable()
export class LogService {
  private readonly entries: LogEntry[] = [];
  private readonly maxEntries: number;

  constructor(config: ConfigService) {
    const size = config.get<number>('logBufferSize');
    this.maxEntries = Number.isInteger(size) && (size as number) > 0 ? (size as number) : 1000;
  }

  addEntry(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getEntries(): LogEntry[] {
    return this.entries.map((e) => ({
      ...e,
      user: e.user ? { ...e.user } : null,
      queryParams: e.queryParams ? { ...e.queryParams } : undefined,
      params: e.params ? { ...e.params } : undefined,
      error: e.error ? { ...e.error } : null,
    }));
  }

  getLatest(): LogEntry | null {
    const last = this.entries[this.entries.length - 1];
    return last
      ? {
          ...last,
          user: last.user ? { ...last.user } : null,
          queryParams: last.queryParams ? { ...last.queryParams } : undefined,
          params: last.params ? { ...last.params } : undefined,
          error: last.error ? { ...last.error } : null,
        }
      : null;
  }

  clear(): void {
    this.entries.length = 0;
  }
}
