import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiException } from './api-exception';
import type { ErrorBody } from './contracts';
import type { LogErrorDetails } from '../logs/log.service';

/**
 * Normalise TOUTES les erreurs au format `{ status, code, message }`
 * consommé par le client mobile (mobile/src/core/api/http-client.ts)
 * ET extrait les détails techniques complets (stack trace, message réel,
 * paramètres, cause, contraintes DTO) pour enrichir les logs back-end
 * et faciliter le débogage.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { _errorDetails?: LogErrorDetails; _exception?: unknown }>();
    const res = ctx.getResponse<Response>();

    const body = this.toBody(exception);
    const errorDetails = this.extractErrorDetails(exception, body);

    // Attache les informations d'erreur enrichies à la requête pour LogCaptureMiddleware & LogService
    if (req) {
      req._errorDetails = errorDetails;
      req._exception = exception;
    }

    res.status(body.status).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof ApiException) {
      return exception.getResponse() as ErrorBody;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message = this.extractMessage(raw, exception.message);
      return { status, code: this.codeFor(status), message };
    }

    // Erreur inattendue : réponse générique sécurisée envoyée au client
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: 'Erreur interne du serveur.',
    };
  }

  /**
   * Extrait les informations techniques complètes pour les journaux d'erreurs (backend logs).
   */
  private extractErrorDetails(exception: unknown, body: ErrorBody): LogErrorDetails {
    if (exception instanceof ApiException) {
      return {
        name: exception.name || 'ApiException',
        message: body.message,
        code: body.code,
        status: body.status,
        stack: exception.stack,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const details = this.extractDetails(raw);
      return {
        name: exception.name || exception.constructor?.name || 'HttpException',
        message: this.extractMessage(raw, exception.message),
        code: body.code,
        status,
        stack: exception.stack,
        details,
        cause: (exception as { cause?: unknown }).cause,
      };
    }

    if (exception instanceof Error) {
      const err = exception as Error & {
        code?: string | number;
        errors?: Record<string, unknown>;
        keyValue?: Record<string, unknown>;
        cause?: unknown;
      };

      let details: unknown = undefined;
      if (err.errors) {
        details = err.errors;
      } else if (err.keyValue) {
        details = { duplicateKey: err.keyValue };
      }

      return {
        name: err.name || err.constructor?.name || 'Error',
        message: err.message || 'Erreur inattendue',
        code: body.code ?? (typeof err.code === 'string' ? err.code : 'INTERNAL'),
        status: body.status,
        stack: err.stack,
        details,
        cause: err.cause,
      };
    }

    // Cas d'une exception non-Error (string, objet brut, etc.)
    return {
      name: 'UnknownException',
      message: typeof exception === 'string' ? exception : JSON.stringify(exception),
      code: body.code,
      status: body.status,
      details: typeof exception === 'object' && exception !== null ? exception : undefined,
    };
  }

  private extractMessage(raw: string | object, fallback: string): string {
    if (typeof raw === 'string') return raw;
    const candidate = (raw as { message?: string | string[] })?.message;
    if (Array.isArray(candidate)) return candidate.join(', ');
    if (typeof candidate === 'string') return candidate;
    return fallback;
  }

  private extractDetails(raw: string | object): unknown {
    if (typeof raw === 'object' && raw !== null) {
      const rawObj = raw as Record<string, unknown>;
      // Si ValidationPipe renvoie un tableau de messages dans raw.message
      if (Array.isArray(rawObj.message)) {
        return rawObj.message;
      }
      if (rawObj.error || rawObj.errors) {
        return rawObj.errors ?? rawObj.error;
      }
    }
    return undefined;
  }

  private codeFor(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'INTERNAL';
      default:
        return 'ERROR';
    }
  }
}
