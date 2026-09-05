import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type {
  FormationCategoryDto,
  FormationPageDto,
  LevelDto,
} from '../common/contracts';
import { CatalogService } from './catalog.service';
import { ListFormationsQueryDto } from './dto/list-formations-query.dto';

/**
 * Routes du catalogue (métadonnées). L'accès au CONTENU est protégé,
 * mais les métadonnées sont visibles pour un utilisateur authentifié
 * (le client affiche les éléments verrouillés grisés + cadenas).
 */
@Controller('formations')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** Liste paginée : recherche `q` + filtre `category` appliqués côté serveur. */
  @Get()
  list(@Query() query: ListFormationsQueryDto): Promise<FormationPageDto> {
    return this.catalog.listFormations(query);
  }

  /** Catégories disponibles pour le filtre de la liste. */
  @Get('categories')
  categories(): Promise<FormationCategoryDto[]> {
    return this.catalog.listCategories();
  }

  @Get(':id/levels')
  levels(@Param('id') id: string): Promise<LevelDto[]> {
    return this.catalog.listLevels(id);
  }
}
