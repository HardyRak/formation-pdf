import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';
import { LevelAccessGuard, DocumentAccessGuard } from '../access/access.guard';
import { Formation, FormationSchema } from './formation.schema';
import { Category, CategorySchema } from './category.schema';
import { Level, LevelSchema } from './level.schema';
import { TrainingDocumentModel, TrainingDocumentSchema } from './document.schema';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Formation.name, schema: FormationSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Level.name, schema: LevelSchema },
      { name: TrainingDocumentModel.name, schema: TrainingDocumentSchema },
    ]),
    AuthModule,
    AccessModule,
  ],
  controllers: [CatalogController, DocumentsController],
  providers: [CatalogService, LevelAccessGuard, DocumentAccessGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
