import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
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
    // eslint-disable-next-line no-console
    console.log(`🌱 Seed vers MongoDB : ${config.get('mongoUri')}`);
    await app.get(SeedService).run();
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('❌ Seed échoué :', error);
  process.exitCode = 1;
});
