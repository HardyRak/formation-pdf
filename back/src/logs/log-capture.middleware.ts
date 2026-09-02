import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../common/auth-user';
import { LogService, type LogUser } from './log.service';
import { maskBody, maskHeaders, maskUrl } from './mask.util';
/**
 * Journalise CHAQUE requête HTTP entrante, quel que soit son résultat :
 *  - écrit une ligne lisible dans la sortie standard (Logger NestJS, coloré
 *    selon le statut) — le journal « durable » de l'application ;
 *  - alimente le tampon mémoire de `LogService`, consultable via `GET /logs`.
 *
 * Toutes les données sensibles (jetons, mots de passe, cookies, clés) sont
 * masquées avant enregistrement (voir `mask.util.ts`). Le corps de réponse
 * n'est volontairement PAS capturé (les flux PDF ne doivent pas être
 * mis en mémoire tampon).
 */
@Injectable()
export class LogCaptureMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly logService: LogService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const method = req.method ?? 'UNKNOWN';
    const url = maskUrl(req.originalUrl || req.url || '/');
    const ip = clientIp(req);
    const userAgent = readHeader(req.headers['user-agent']);
    // Capturés à l'entrée (le corps peut être consommé ensuite).
    const requestHeaders = maskHeaders(req.headers as Record<string, unknown>);
    const requestBody = maskBody(req.body);

    res.on('finish', () => {
      const statusCode = res.statusCode;
      const durationMs = Date.now() - start;
      // L'utilisateur est posé par les guards (JwtAuthGuard) APRÈS le middleware :
      // on le lit donc à la fin du cycle requête/réponse.
      const user = readUser(req);
      const responseHeaders = maskHeaders(res.getHeaders() as Record<string, unknown>);

      const entry = {
        timestamp: new Date().toISOString(),
        method,
        url,
        statusCode,
        durationMs,
        ip,
        userAgent,
        user,
        requestHeaders,
        responseHeaders,
        requestBody,
        message: `${method} ${url} → ${statusCode} (${durationMs} ms)`,
      };

      this.logService.addEntry(entry);
      this.writeToConsole(entry);
    });

    next();
  }

  private writeToConsole(entry: LogServiceEntry): void {
    const userLabel = entry.user ? `${entry.user.email} (${entry.user.id})` : 'anonyme';
    const line =
      `${entry.method} ${entry.url} → ${entry.statusCode} ` +
      `${entry.durationMs} ms · ip=${entry.ip} · user=${userLabel}`;

    if (entry.statusCode >= 500) {
      this.logger.error(line);
    } else if (entry.statusCode >= 400) {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }
  }
}

type LogServiceEntry = {
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  user: LogUser | null;
};

/** Extrait l'adresse IP du client (en-tête `x-forwarded-for` puis socket). */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).trim();
  }
  return req.socket?.remoteAddress ?? 'inconnue';
}

/** Convertit une valeur d'en-tête (string | string[] | undefined) en chaîne. */
function readHeader(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

/** Récupère l'utilisateur authentifié (posé par JwtAuthGuard), sinon `null`. */
function readUser(req: Request): LogUser | null {
  const user = (req as Request & { user?: AuthUser }).user;
  if (user && typeof user.id === 'string') {
    return { id: user.id, email: user.email, role: user.role };
  }
  return null;
}
