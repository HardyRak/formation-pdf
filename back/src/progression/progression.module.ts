import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { DocumentProgress, DocumentProgressSchema } from './document-progress.schema';
import { ProgressionService } from './progression.service';
import { ProgressionController } from './progression.controller';

/**
 * Module de persistance de la progression utilisateur en base.
 * Le mobile pousse ses modifications (offline-first, file d'attente) et se
 * réaligne au démarrage via GET /progression.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentProgress.name, schema: DocumentProgressSchema },
    ]),
    AuthModule,
  ],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
