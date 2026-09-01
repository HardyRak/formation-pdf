import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogService } from './log.service';

@Injectable()
export class LogCaptureMiddleware implements NestMiddleware {
  constructor(private readonly logService: LogService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const maskedHeaders = this.maskHeaders(req.headers);
    const maskedBody = this.maskBody(req.body);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const maskedUrl = this.maskUrl(req.originalUrl || req.url);
      const maskedResponseHeaders = this.maskHeaders(res.getHeaders());

      this.logService.addEntry({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: maskedUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        requestHeaders: maskedHeaders,
        responseHeaders: maskedResponseHeaders,
        requestBody: maskedBody,
        message: `[${req.method}] ${maskedUrl} → ${res.statusCode} (${duration}ms)`,
      });
    });

    next();
  }

  private maskHeaders(headers: unknown): Record<string, unknown> {
    const { maskHeaders } = require('./mask.util');
    return maskHeaders(headers as Record<string, unknown>);
  }

  private maskBody(body: unknown): unknown {
    const { maskBody } = require('./mask.util');
    return maskBody(body);
  }

  private maskUrl(url: string): string {
    const { maskUrl } = require('./mask.util');
    return maskUrl(url);
  }
}
