import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from '../common/api-exception';
import type { AuthUser } from '../common/auth-user';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'LEARNER' | 'MANAGER';
  typ: 'access';
}

/**
 * Guard d'authentification par jeton Bearer.
 * Vérifie la signature, la date d'expiration et le type ('access').
 * Le jeton de rafraîchissement (typ !== 'access') est refusé ici.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Authentification requise.');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      if (payload.typ !== 'access') {
        throw new Error('token de type invalide');
      }
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      request.user = user;
      return true;
    } catch (error: unknown) {
      const expired = (error as { name?: string })?.name === 'TokenExpiredError';
      throw new ApiException(
        401,
        expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
        expired
          ? 'Votre session a expiré. Merci de vous reconnecter.'
          : 'Jeton invalide.',
      );
    }
  }
}
