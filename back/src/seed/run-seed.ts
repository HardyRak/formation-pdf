import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { maskMongoUri } from '../config/configuration';
import { SeedAppModule } from './seed-app.module';
import { SeedService } from './seed.service';

/**
 * Script de seed :
 *   npm run seed
 * Lit `.env`, se connecte à MongoDB, réinitialise et peuple la base.
 */
async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedAppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const config = app.get(ConfigService);
    // L'URI est journalisée SANS identifiants (jamais de mot de passe en clair).
    Logger.log(`🌱 Seed vers MongoDB : ${maskMongoUri(config.get<string>('mongoUri') ?? '')}`, 'Seed');
    await app.get(SeedService).run();
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  Logger.error('❌ Seed échoué :', error instanceof Error ? error.stack : String(error), 'Seed');
  process.exitCode = 1;
});
