import { HttpException } from '@nestjs/common';
import type { ErrorBody } from './contracts';

/**
 * Exception métier au format attendu par le client mobile :
 * `{ status, code, message }`.
 */
export class ApiException extends HttpException {
  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    const body: ErrorBody = { status, code, message };
    super(body, status);
  }
}
