import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { ensureUploadDir } from './admin/uploads';

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
