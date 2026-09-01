import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import type {
  DocumentProgressDto,
  ProgressionResetResultDto,
} from '../common/contracts';
import { ProgressionService } from './progression.service';
import { UpsertDocumentProgressDto } from './dto/upsert-document-progress.dto';

/**
 * Progression de lecture, persistée en base MongoDB (collection
 * `document_progress`). Toutes les routes sont authentifiées et scopées à
 * l'utilisateur du JWT : chaque appareil synchronise SA progression.
 */
@Controller('progression')
@UseGuards(JwtAuthGuard)
export class ProgressionController {
  constructor(private readonly progression: ProgressionService) {}

  /** Toute la progression de l'utilisateur (réalignement au démarrage). */
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<DocumentProgressDto[]> {
    return this.progression.listFor(user.id);
  }

  /**
   * Upsert fusionné de la progression d'un document.
   * Idempotent : peut être rejoué sans risque après une coupure réseau.
   */
  @Put('documents/:documentId')
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('documentId') documentId: string,
    @Body() body: UpsertDocumentProgressDto,
  ): Promise<DocumentProgressDto> {
    return this.progression.upsert(user.id, documentId, body);
  }

  /** Efface la progression d'un seul document. */
  @Delete('documents/:documentId')
  async resetDocument(
    @CurrentUser() user: AuthUser,
    @Param('documentId') documentId: string,
  ): Promise<ProgressionResetResultDto> {
    await this.progression.resetOne(user.id, documentId);
    return { success: true };
  }

  /** Efface toute la progression de l'utilisateur. */
  @Delete()
  async resetAll(@CurrentUser() user: AuthUser): Promise<ProgressionResetResultDto> {
    const deletedCount = await this.progression.resetAll(user.id);
    return { success: true, deletedCount };
  }
}
