import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiException } from './api-exception';
import type { ErrorBody } from './contracts';

/**
 * Normalise TOUTES les erreurs au format `{ status, code, message }`
 * consommé par le client mobile (mobile/src/core/api/http-client.ts).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
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

    // Erreur inattendue : on ne fuit aucun détail interne.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: 'Erreur interne du serveur.',
    };
  }

  private extractMessage(raw: string | object, fallback: string): string {
    if (typeof raw === 'string') return raw;
    const candidate = (raw as { message?: string | string[] })?.message;
    if (Array.isArray(candidate)) return candidate.join(', ');
    if (typeof candidate === 'string') return candidate;
    return fallback;
  }

  private codeFor(status: number): string {
    switch (status) {
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'ERROR';
    }
  }
}
