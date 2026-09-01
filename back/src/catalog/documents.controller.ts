import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LevelAccessGuard, DocumentAccessGuard } from '../access/access.guard';
import type { StreamDto, TrainingDocumentDto } from '../common/contracts';
import { CatalogService } from './catalog.service';

/**
 * Routes du contenu (documents + flux). Protégées par JwtAuthGuard ET par le
 * contrôle d'accès (403 si l'utilisateur n'a pas le droit d'ouvrir la
 * formation/le niveau). Aucune URL publique n'expose le contenu.
 */
@Controller()
export class DocumentsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('levels/:levelId/documents')
  @UseGuards(JwtAuthGuard, LevelAccessGuard)
  listByLevel(@Param('levelId') levelId: string): Promise<TrainingDocumentDto[]> {
    return this.catalog.listDocuments(levelId);
  }

  @Get('documents/:id')
  @UseGuards(JwtAuthGuard, DocumentAccessGuard)
  get(@Param('id') id: string): Promise<TrainingDocumentDto> {
    return this.catalog.getDocument(id);
  }

  @Get('documents/:id/stream')
  @UseGuards(JwtAuthGuard, DocumentAccessGuard)
  async stream(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamDto> {
    // Le contenu confidentiel ne doit jamais être mis en cache.
    res.setHeader('Cache-Control', 'no-store');
    return this.catalog.stream(id);
  }
}
