import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/user.schema';
import { Formation, FormationSchema } from '../catalog/formation.schema';
import { Category, CategorySchema } from '../catalog/category.schema';
import { Level, LevelSchema } from '../catalog/level.schema';
import {
  TrainingDocumentModel,
  TrainingDocumentSchema,
} from '../catalog/document.schema';
import { AccessModule } from '../access/access.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ManagerGuard } from './manager.guard';

/**
 * Module d'administration du back-office.
 * Accessible uniquement aux comptes `MANAGER` (garde `ManagerGuard`).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Formation.name, schema: FormationSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Level.name, schema: LevelSchema },
      { name: TrainingDocumentModel.name, schema: TrainingDocumentSchema },
    ]),
    AccessModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, ManagerGuard],
  exports: [AdminService],
})
export class AdminModule {}
