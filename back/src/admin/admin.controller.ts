import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManagerGuard } from './manager.guard';
import { AdminUsersService } from './admin-users.service';
import { AdminAccessService } from './admin-access.service';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminStatsService } from './admin-stats.service';
import { pdfMulterStorage } from './uploads';
import { ApiException } from '../common/api-exception';
import {
  CreateCategoryDto,
  DocumentTitlesDto,
  CreateDocumentDto,
  CreateFormationDto,
  CreateLevelDto,
  CreateUserDto,
  GrantAccessDto,
  SetActiveDto,
  UpdateCategoryDto,
  UpdateDocumentDto,
  UpdateFormationDto,
  UpdateLevelDto,
  UpdateUserDto,
} from './dto';

/**
 * Routes d'administration (réservées au rôle MANAGER).
 * Toutes sont protégées par JwtAuthGuard PUIS ManagerGuard.
 * Sous préfixe global `/v1`, donc accessibles via `/v1/admin/*`.
 *
 * Le contrôleur reste volontairement mince : la logique métier vit dans les
 * services dédiés (`AdminUsersService`, `AdminAccessService`,
 * `AdminCatalogService`, `AdminStatsService`).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, ManagerGuard)
export class AdminController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly access: AdminAccessService,
    private readonly catalog: AdminCatalogService,
    private readonly statsService: AdminStatsService,
  ) {}

  // ---- Utilisateurs --------------------------------------------------------

  @Get('users')
  listUsers(@Query('q') q?: string, @Query('role') role?: string) {
    return this.users.listUsers(q, role);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.users.getUser(id);
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }

  @Post('users/:id/active')
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.users.setActive(id, dto.active);
  }

  // ---- Accès ------------------------------------------------------------------

  @Get('access')
  listGrants(@Query('userId') userId?: string) {
    return this.access.listGrants(userId);
  }

  @Post('access')
  grant(@Body() dto: GrantAccessDto) {
    return this.access.grantDocument(
      dto.userId,
      dto.formationId,
      dto.levelIds ?? [],
      dto.documentIds ?? [],
    );
  }

  @Delete('access/:userId/:formationId')
  revoke(@Param('userId') userId: string, @Param('formationId') formationId: string) {
    return this.access.revokeGrant(userId, formationId);
  }

  @Delete('access/document/:userId/:documentId')
  revokeDocument(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.access.revokeDocument(userId, documentId);
  }

  // ---- Catégories ----------------------------------------------------------------

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(dto);
  }

  @Patch('categories/:id')
  renameCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalog.renameCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.catalog.deleteCategory(id);
  }

  // ---- Formations --------------------------------------------------------------

  @Get('formations')
  listFormations() {
    return this.catalog.listFormations();
  }

  @Post('formations')
  createFormation(@Body() dto: CreateFormationDto) {
    return this.catalog.createFormation(dto);
  }

  @Patch('formations/:id')
  updateFormation(@Param('id') id: string, @Body() dto: UpdateFormationDto) {
    return this.catalog.updateFormation(id, toPlain(dto));
  }

  @Delete('formations/:id')
  deleteFormation(@Param('id') id: string) {
    return this.catalog.deleteFormation(id);
  }

  // ---- Niveaux -------------------------------------------------------------

  @Get('formations/:id/levels')
  listLevels(@Param('id') id: string) {
    return this.catalog.listLevels(id);
  }

  @Post('formations/:id/levels')
  createLevel(@Param('id') id: string, @Body() dto: CreateLevelDto) {
    return this.catalog.createLevel(id, dto);
  }

  @Patch('levels/:id')
  updateLevel(@Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.catalog.updateLevel(id, toPlain(dto));
  }

  @Delete('levels/:id')
  deleteLevel(@Param('id') id: string) {
    return this.catalog.deleteLevel(id);
  }

  // ---- Documents + PDF -------------------------------------------------------

  @Get('levels/:id/documents')
  listDocuments(@Param('id') id: string) {
    return this.catalog.listDocuments(id);
  }

  @Post('documents/titles')
  documentTitles(@Body() dto: DocumentTitlesDto) {
    return this.catalog.documentTitles(dto.ids ?? []);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    return this.catalog.getDocument(id);
  }

  @Post('levels/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: pdfMulterStorage(),
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_MB ?? '50', 10) * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        cb(isPdf(file) ? null : new Error('Seuls les fichiers PDF sont acceptés.'), isPdf(file));
      },
    }),
  )
  createDocument(
    @Param('id') levelId: string,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new ApiException(400, 'INVALID', 'Un fichier PDF est requis.');
    }
    return this.catalog.createDocumentWithFile(levelId, dto, file);
  }

  @Put('documents/:id/content')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: pdfMulterStorage(),
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_MB ?? '50', 10) * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        cb(isPdf(file) ? null : new Error('Seuls les fichiers PDF sont acceptés.'), isPdf(file));
      },
    }),
  )
  replaceDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new ApiException(400, 'INVALID', 'Un fichier PDF est requis.');
    }
    return this.catalog.replaceDocumentFile(id, file);
  }

  @Patch('documents/:id')
  updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.catalog.updateDocument(id, toPlain(dto));
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.catalog.deleteDocument(id);
  }

  // ---- Statistiques ---------------------------------------------------------

  @Get('stats')
  stats() {
    return this.statsService.stats();
  }
}

/** Convertit un DTO en objet plat (les champs `undefined` sont ignorés). */
function toPlain<T extends object>(dto: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dto)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Un fichier est accepté si son type MIME est `application/pdf` ou son extension `.pdf`. */
function isPdf(file: { mimetype: string; originalname: string }): boolean {
  const ext = extname(file.originalname).toLowerCase();
  return file.mimetype === 'application/pdf' || ext === '.pdf';
}
