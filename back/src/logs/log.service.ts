import { Injectable } from '@nestjs/common';

/** Utilisateur authentifié ayant émis la requête (extrait du JWT par les guards). */
export interface LogUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Entrée de journal pour une requête HTTP entrante.
 * Les champs sensibles (en-têtes, corps) sont déjà masqués en amont
 * par `mask.util.ts`.
 */
export interface LogEntry {
  /** Horodatage ISO 8601 de la fin de requête. */
  timestamp: string;
  method: string;
  /** Chemin + query string (jetons/identifiants masqués). */
  url: string;
  statusCode: number;
  durationMs: number;
  /** Adresse IP du client (derrière reverse proxy si présent). */
  ip: string;
  userAgent: string;
  /** Utilisateur authentifié, `null` si la route est publique. */
  user: LogUser | null;
  requestHeaders: Record<string, unknown>;
  responseHeaders: Record<string, unknown>;
  requestBody: unknown;
  /** Résumé lisible : « [GET] /v1/health → 200 (12 ms) ». */
  message: string;
}

/** Taille maximale du tampon mémoire (configurable via `LOG_BUFFER_SIZE`). */
function resolveMaxEntries(): number {
  const parsed = Number.parseInt(process.env.LOG_BUFFER_SIZE ?? '1000', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
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
  private readonly maxEntries = resolveMaxEntries();

  addEntry(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getEntries(): LogEntry[] {
    return this.entries.map((e) => ({ ...e, user: e.user ? { ...e.user } : null }));
  }

  getLatest(): LogEntry | null {
    const last = this.entries[this.entries.length - 1];
    return last ? { ...last, user: last.user ? { ...last.user } : null } : null;
  }

  clear(): void {
    this.entries.length = 0;
  }
}
