import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../common/auth-user';
import { LogService, type LogEntry, type LogErrorDetails, type LogUser } from './log.service';
import { maskBody, maskHeaders, maskParams, maskUrl } from './mask.util';

/**
 * Journalise CHAQUE requête HTTP entrante, quel que soit son résultat :
 *  - écrit une ligne lisible et enrichie dans la sortie standard (Logger NestJS)
 *    avec détails techniques complets et stack trace en cas d'erreur ;
 *  - alimente le tampon mémoire de `LogService`, consultable via `GET /logs`.
 *
 * Toutes les données sensibles (jetons, mots de passe, cookies, clés) sont
 * masquées avant enregistrement (voir `mask.util.ts`). Le corps de réponse
 * binaire n'est volontairement PAS capturé (les flux PDF ne doivent pas être
 * mis en mémoire tampon).
 */
@Injectable()
export class LogCaptureMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly logService: LogService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const method = req.method ?? 'UNKNOWN';
    const rawUrl = req.originalUrl || req.url || '/';
    const url = maskUrl(rawUrl);
    const path = req.path || rawUrl.split('?')[0] || '/';
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
      const queryParams = maskParams(req.query as Record<string, unknown>);
      const params = maskParams(req.params as Record<string, unknown>);

      // Fichier uploadé éventuel (Multer)
      let bodyToStore = requestBody;
      const reqWithFile = req as Request & {
        file?: Express.Multer.File;
        files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
        _errorDetails?: LogErrorDetails;
        _exception?: unknown;
      };

      if (reqWithFile.file) {
        const f = reqWithFile.file;
        const fileInfo = {
          fieldname: f.fieldname,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
        };
        bodyToStore =
          typeof bodyToStore === 'object' && bodyToStore !== null
            ? { ...(bodyToStore as Record<string, unknown>), _file: fileInfo }
            : { _file: fileInfo };
      }

      // Récupération des détails d'erreur enrichis
      let errorDetails: LogErrorDetails | null = reqWithFile._errorDetails ?? null;

      if (!errorDetails && statusCode >= 400) {
        const ex = reqWithFile._exception;
        if (ex instanceof Error) {
          errorDetails = {
            name: ex.name,
            message: ex.message,
            stack: ex.stack,
            status: statusCode,
          };
        } else if (ex) {
          errorDetails = {
            name: 'HttpError',
            message: typeof ex === 'string' ? ex : JSON.stringify(ex),
            status: statusCode,
          };
        } else {
          errorDetails = {
            name: statusCode >= 500 ? 'InternalServerError' : 'HttpError',
            message: res.statusMessage || `HTTP ${statusCode}`,
            status: statusCode,
          };
        }
      }

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        method,
        url,
        path,
        statusCode,
        durationMs,
        ip,
        userAgent,
        user,
        queryParams: queryParams && Object.keys(queryParams).length > 0 ? queryParams : undefined,
        params: params && Object.keys(params).length > 0 ? params : undefined,
        requestHeaders,
        responseHeaders,
        requestBody: bodyToStore,
        error: errorDetails,
        message: `${method} ${url} → ${statusCode} (${durationMs} ms)`,
      };

      this.logService.addEntry(entry);
      this.writeToConsole(entry);
    });

    next();
  }

  private writeToConsole(entry: LogEntry): void {
    const userLabel = entry.user ? `${entry.user.email} (${entry.user.id})` : 'anonyme';
    const line =
      `${entry.method} ${entry.url} → ${entry.statusCode} ` +
      `${entry.durationMs} ms · ip=${entry.ip} · user=${userLabel}`;

    if (entry.statusCode >= 500) {
      const detailLines: string[] = [line];
      if (entry.error) {
        const codeSuffix = entry.error.code ? ` [${entry.error.code}]` : '';
        detailLines.push(`  ↳ Exception${codeSuffix}: ${entry.error.name}: ${entry.error.message}`);
        if (entry.error.details !== undefined && entry.error.details !== null) {
          const formattedDetails =
            typeof entry.error.details === 'string'
              ? entry.error.details
              : JSON.stringify(entry.error.details, null, 2);
          detailLines.push(`  ↳ Details: ${formattedDetails}`);
        }
        if (entry.error.cause !== undefined && entry.error.cause !== null) {
          const formattedCause =
            typeof entry.error.cause === 'string'
              ? entry.error.cause
              : JSON.stringify(entry.error.cause);
          detailLines.push(`  ↳ Cause: ${formattedCause}`);
        }
      }
      if (entry.params && Object.keys(entry.params).length > 0) {
        detailLines.push(`  ↳ Params: ${JSON.stringify(entry.params)}`);
      }
      if (entry.queryParams && Object.keys(entry.queryParams).length > 0) {
        detailLines.push(`  ↳ Query: ${JSON.stringify(entry.queryParams)}`);
      }
      if (
        entry.requestBody &&
        typeof entry.requestBody === 'object' &&
        Object.keys(entry.requestBody as object).length > 0
      ) {
        detailLines.push(`  ↳ Body: ${JSON.stringify(entry.requestBody)}`);
      }

      this.logger.error(detailLines.join('\n'), entry.error?.stack);
    } else if (entry.statusCode >= 400) {
      const detailLines: string[] = [line];
      if (entry.error) {
        const codeSuffix = entry.error.code ? ` [${entry.error.code}]` : '';
        detailLines.push(`  ↳ Error${codeSuffix}: ${entry.error.name ? `${entry.error.name}: ` : ''}${entry.error.message}`);
        if (entry.error.details !== undefined && entry.error.details !== null) {
          const formattedDetails =
            typeof entry.error.details === 'string'
              ? entry.error.details
              : JSON.stringify(entry.error.details);
          detailLines.push(`  ↳ Details: ${formattedDetails}`);
        }
      }
      if (entry.params && Object.keys(entry.params).length > 0) {
        detailLines.push(`  ↳ Params: ${JSON.stringify(entry.params)}`);
      }
      if (entry.queryParams && Object.keys(entry.queryParams).length > 0) {
        detailLines.push(`  ↳ Query: ${JSON.stringify(entry.queryParams)}`);
      }
      if (
        entry.requestBody &&
        typeof entry.requestBody === 'object' &&
        Object.keys(entry.requestBody as object).length > 0
      ) {
        detailLines.push(`  ↳ Body: ${JSON.stringify(entry.requestBody)}`);
      }

      this.logger.warn(detailLines.join('\n'));
    } else {
      this.logger.log(line);
    }
  }
}

/**
 * Adresse IP du client, résolue par Express : `req.ip` reflète
 * `X-Forwarded-For` UNIQUEMENT si `trust proxy` est activé (voir main.ts),
 * sinon l'adresse de la socket. Les en-têtes fournis par le client ne sont
 * donc jamais exploités tels quels.
 */
function clientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'inconnue';
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
