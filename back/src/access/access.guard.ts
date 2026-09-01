import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception';
import type { AuthUser } from '../common/auth-user';
import { CatalogService } from '../catalog/catalog.service';
import { AccessService } from './access.service';

/**
 * Garde d'accès au niveau : vérifie que l'utilisateur authentifié a le droit
 * d'ouvrir le niveau demandé. 404 si le niveau n'existe pas, 403 sinon.
 */
@Injectable()
export class LevelAccessGuard implements CanActivate {
  constructor(
    private readonly catalog: CatalogService,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    const levelId: string = request.params?.levelId;
    const level = await this.catalog.findLevel(levelId);
    if (!level) throw new ApiException(404, 'NOT_FOUND', 'Niveau introuvable.');
    const allowed = await this.access.canReadLevel(user, level.formationId, levelId);
    if (!allowed) {
      throw new ApiException(403, 'FORBIDDEN', "Vous n'avez pas accès à ce niveau.");
    }
    return true;
  }
}

/**
 * Garde d'accès au document : vérifie que l'utilisateur a le droit d'ouvrir
 * le document (et donc sa formation/niveau). 404 si inexistant, 403 sinon.
 */
@Injectable()
export class DocumentAccessGuard implements CanActivate {
  constructor(
    private readonly catalog: CatalogService,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    const documentId: string = request.params?.id;
    const document = await this.catalog.findDocument(documentId);
    if (!document) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    const allowed = await this.access.canReadLevel(user, document.formationId, document.levelId);
    if (!allowed) {
      throw new ApiException(403, 'FORBIDDEN', "Vous n'avez pas accès à ce document.");
    }
    return true;
  }
}
