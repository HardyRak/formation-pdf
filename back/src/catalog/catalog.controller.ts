import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { FormationDto, LevelDto } from '../common/contracts';
import { CatalogService } from './catalog.service';

/**
 * Routes du catalogue (métadonnées). L'accès au CONTENU est protégé,
 * mais les métadonnées sont visibles pour un utilisateur authentifié
 * (le client affiche les éléments verrouillés grisés + cadenas).
 */
@Controller('formations')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(): Promise<FormationDto[]> {
    return this.catalog.listFormations();
  }

  @Get(':id/levels')
  levels(@Param('id') id: string): Promise<LevelDto[]> {
    return this.catalog.listLevels(id);
  }
}
