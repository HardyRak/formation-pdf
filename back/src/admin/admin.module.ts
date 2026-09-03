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
import { AdminUsersService } from './admin-users.service';
import { AdminAccessService } from './admin-access.service';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminStatsService } from './admin-stats.service';
import { ManagerGuard } from './manager.guard';

/**
 * Module d'administration du back-office.
 * Accessible uniquement aux comptes `MANAGER` (garde `ManagerGuard`).
 *
 * La logique est répartie en services focalisés :
 *  - `AdminUsersService`  : CRUD des comptes ;
 *  - `AdminAccessService` : attribution / révocation des droits d'accès ;
 *  - `AdminCatalogService`: CRUD du catalogue (formations / niveaux / documents /
 *                           catégories) + import PDF ;
 *  - `AdminStatsService`  : agrégations du tableau de bord.
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
  providers: [
    AdminUsersService,
    AdminAccessService,
    AdminCatalogService,
    AdminStatsService,
    ManagerGuard,
  ],
  exports: [
    AdminUsersService,
    AdminAccessService,
    AdminCatalogService,
    AdminStatsService,
  ],
})
export class AdminModule {}
