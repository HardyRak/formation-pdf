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
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManagerGuard } from './manager.guard';
import { AdminService } from './admin.service';
import { pdfMulterStorage } from './uploads';
import { ApiException } from '../common/api-exception';
import {
  CreateDocumentDto,
  CreateFormationDto,
  CreateLevelDto,
  CreateUserDto,
  GrantAccessDto,
  SetActiveDto,
  UpdateDocumentDto,
  UpdateFormationDto,
  UpdateLevelDto,
  UpdateUserDto,
} from './dto';

/**
 * Routes d'administration (réservées au rôle MANAGER).
 * Toutes sont protégées par JwtAuthGuard PUIS ManagerGuard.
 * Sous préfixe global `/v1`, donc accessibles via `/v1/admin/*`.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, ManagerGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly config: ConfigService,
  ) {}

  // ---- Utilisateurs --------------------------------------------------------

  @Get('users')
  listUsers(@Query('q') q?: string, @Query('role') role?: string) {
    return this.admin.listUsers(q, role);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(id, dto);
  }

  @Post('users/:id/active')
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.admin.setActive(id, dto.active);
  }

  // ---- Accès ------------------------------------------------------------------

  @Get('access')
  listGrants(@Query('userId') userId?: string) {
    return this.admin.listGrants(userId);
  }

  @Post('access')
  grant(@Body() dto: GrantAccessDto) {
    return this.admin.grantDocument(
      dto.userId,
      dto.formationId,
      dto.levelIds ?? [],
      dto.documentIds ?? [],
    );
  }

  @Delete('access/:userId/:formationId')
  revoke(@Param('userId') userId: string, @Param('formationId') formationId: string) {
    return this.admin.revokeGrant(userId, formationId);
  }

  @Delete('access/document/:userId/:documentId')
  revokeDocument(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.admin.revokeDocument(userId, documentId);
  }

  // ---- Formations --------------------------------------------------------------

  @Get('formations')
  listFormations() {
    return this.admin.listFormations();
  }

  @Post('formations')
  createFormation(@Body() dto: CreateFormationDto) {
    return this.admin.createFormation(dto);
  }

  @Patch('formations/:id')
  updateFormation(@Param('id') id: string, @Body() dto: UpdateFormationDto) {
    return this.admin.updateFormation(id, toPlain(dto));
  }

  @Delete('formations/:id')
  deleteFormation(@Param('id') id: string) {
    return this.admin.deleteFormation(id);
  }

  // ---- Niveaux -------------------------------------------------------------

  @Get('formations/:id/levels')
  listLevels(@Param('id') id: string) {
    return this.admin.listLevels(id);
  }

  @Post('formations/:id/levels')
  createLevel(@Param('id') id: string, @Body() dto: CreateLevelDto) {
    return this.admin.createLevel(id, dto);
  }

  @Patch('levels/:id')
  updateLevel(@Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.admin.updateLevel(id, toPlain(dto));
  }

  @Delete('levels/:id')
  deleteLevel(@Param('id') id: string) {
    return this.admin.deleteLevel(id);
  }

  // ---- Documents + PDF -------------------------------------------------------

  @Get('levels/:id/documents')
  listDocuments(@Param('id') id: string) {
    return this.admin.listDocuments(id);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    return this.admin.getDocument(id);
  }

  @Post('levels/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: pdfMulterStorage(),
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_MB ?? '50', 10) * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const isPdf =
          file.mimetype === 'application/pdf' || ext === '.pdf';
        cb(isPdf ? null : new Error('Seuls les fichiers PDF sont acceptés.'), isPdf);
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
    return this.admin.createDocumentWithFile(levelId, dto, file);
  }

  @Put('documents/:id/content')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: pdfMulterStorage(),
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_MB ?? '50', 10) * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';
        cb(isPdf ? null : new Error('Seuls les fichiers PDF sont acceptés.'), isPdf);
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
    return this.admin.replaceDocumentFile(id, file);
  }

  @Patch('documents/:id')
  updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.admin.updateDocument(id, toPlain(dto));
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.admin.deleteDocument(id);
  }

  // ---- Statistiques ---------------------------------------------------------

  @Get('stats')
  stats() {
    return this.admin.stats();
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
