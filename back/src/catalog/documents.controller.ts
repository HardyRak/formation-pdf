import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LevelAccessGuard, DocumentAccessGuard } from '../access/access.guard';
import type { StreamDto, TrainingDocumentDto } from '../common/contracts';
import { CatalogService } from './catalog.service';

/**
 * Routes du contenu (documents + flux). Protégées par JwtAuthGuard ET par le
 * contrôle d'accès (403 si l'utilisateur n'a pas le droit d'ouvrir la
 * formation/le niveau/le document). Aucune URL publique n'expose le contenu.
 *
 * `/stream` sert :
 *  - le **binaire PDF** (`filePath` renseigné) — nouvelle modalité « vrai PDF » ;
 *  - sinon le contenu structuré en blocs (compatibilité seed / mobile actuel).
 */
@Controller()
export class DocumentsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly config: ConfigService,
  ) {}

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
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Le contenu confidentiel ne doit jamais être mis en cache.
    res.setHeader('Cache-Control', 'no-store');

    const document = await this.catalog.findDocument(id);
    if (!document) {
      res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Document introuvable.' });
      return;
    }

    const uploadDir = this.config.get<string>('uploadDir') ?? 'uploads';
    const filePath = document.filePath;
    const absolute = filePath ? join(uploadDir, filePath) : '';

    if (filePath && existsSync(absolute)) {
      const originalFilename = safeFilename(document.originalFilename || `${id}.pdf`);
      res.setHeader('Content-Type', document.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${originalFilename}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.status(200);
      createReadStream(absolute)
        .on('error', () => {
          if (!res.headersSent) {
            res.status(404).json({
              status: 404,
              code: 'NOT_FOUND',
              message: 'Fichier introuvable.',
            });
          }
        })
        .pipe(res);
      return;
    }

    // Fallback : contenu structuré en blocs (ancien modèle).
    const stream = await this.catalog.stream(id);
    const body: StreamDto = { documentId: stream.documentId, pages: stream.pages };
    res.status(200).json(body);
  }
}

/** Nettoie un nom de fichier pour l'en-tête Content-Disposition. */
function safeFilename(name: string): string {
  return name.replace(/[^\w.\-]/g, '_').slice(0, 120);
}
