import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception';
import type { AuthUser } from '../common/auth-user';

/**
 * Garde d'administration : seuls les utilisateurs avec le rôle `MANAGER`
 * peuvent accéder aux routes `/admin/*`. Un apprenant reçoit 403.
 * Doit être utilisée APRÈS `JwtAuthGuard` (l'objet `request.user` est posé).
 */
@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Authentification requise.');
    }
    if (user.role !== 'MANAGER') {
      throw new ApiException(403, 'FORBIDDEN', 'Accès réservé aux responsables de formation.');
    }
    return true;
  }
}
