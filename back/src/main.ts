import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { ensureUploadDir } from './admin/uploads';

// Capture des rejets asynchrones et exceptions non interceptées avec NestJS Logger
const systemLogger = new Logger('System');

process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error) {
    systemLogger.error(`Promesse non gérée (UnhandledRejection): ${reason.message}`, reason.stack);
  } else {
    systemLogger.error(`Promesse non gérée (UnhandledRejection): ${String(reason)}`);
  }
});

process.on('uncaughtException', (err: Error) => {
  systemLogger.error(`Exception non interceptée (UncaughtException): ${err.message}`, err.stack);
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Préfixe global : correspond à API_BASE_URL = …/v1 côté mobile.
  app.setGlobalPrefix('v1');

  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });

  // Derrière un reverse proxy de confiance (TRUST_PROXY=true), on autorise
  // Express à lire X-Forwarded-For afin de journaliser la vraie IP du client.
  // Sinon, ces en-têtes (falsifiables) sont ignorés : `req.ip` = socket.
  if (config.get<boolean>('trustProxy') === true) {
    const express = app.getHttpAdapter().getInstance() as Express;
    express.set('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  // Dossier de stockage des PDF (volume) — créé au démarrage.
  ensureUploadDir();

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 PDF Formation API disponible sur http://localhost:${port}/v1`);
}

void bootstrap();
