import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessGrant, AccessGrantSchema } from './access-grant.schema';
import { AccessService } from './access.service';

/**
 * Module du contrôle d'accès.
 * Les guards (LevelAccessGuard, DocumentAccessGuard) sont déclarés dans
 * CatalogModule (ils dépendent de CatalogService) pour éviter toute
 * dépendance circulaire entre modules.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: AccessGrant.name, schema: AccessGrantSchema }])],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
