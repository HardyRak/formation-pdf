import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiException } from '../common/api-exception';
import type { AuthSessionDto, UserDto } from '../common/contracts';
import type { AuthUser } from '../common/auth-user';
import { User, UserDocument } from '../users/user.schema';
import { RefreshToken, RefreshTokenDocument } from './refresh-token.schema';
import { verifyPassword } from './password.util';
import { generateRefreshToken, sha256 } from './token.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokens: Model<RefreshTokenDocument>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthSessionDto> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findOne({ email: normalized }).lean();
    if (!user) {
      throw new ApiException(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }
    if (user.active === false) {
      throw new ApiException(403, 'ACCOUNT_DISABLED', 'Compte désactivé. Contactez votre responsable.');
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiException(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }
    return this.issueSession(user);
  }

  /**
   * Rafraîchit une session. Rotation du jeton : l'ancien est révoqué,
   * un nouveau est émis et devient le seul valide.
   */
  async refresh(refreshToken: string): Promise<AuthSessionDto> {
    const hash = sha256(refreshToken);
    const stored = await this.refreshTokens.findById(hash).lean();
    if (!stored || stored.revoked || stored.expiresAt.getTime() < Date.now()) {
      throw new ApiException(401, 'REFRESH_EXPIRED', 'Session expirée, reconnexion nécessaire.');
    }
    const user = await this.users.findById(stored.userId).lean();
    if (!user) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Compte introuvable.');
    }
    if (user.active === false) {
      throw new ApiException(403, 'ACCOUNT_DISABLED', 'Compte désactivé. Contactez votre responsable.');
    }

    // Rotation : on invalide l'ancien et on trace son remplaçant.
    const newToken = generateRefreshToken();
    await this.refreshTokens.updateOne(
      { _id: hash },
      { $set: { revoked: true, replacedByHash: sha256(newToken) } },
    );
    await this.persistRefreshToken(newToken, user._id);

    return this.issueSession(user, newToken);
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.refreshTokens.updateMany({ userId }, { $set: { revoked: true } });
    return { success: true };
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId).lean();
    if (!user) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Compte introuvable.');
    }
    return toUserDto(user);
  }

  async issueSession(
    user: User & { _id: string },
    refreshTokenOverride?: string,
  ): Promise<AuthSessionDto> {
    const accessTtlSeconds = this.config.get<number>('jwt.accessTtlSeconds') ?? 900;
    const refreshToken = refreshTokenOverride ?? generateRefreshToken();

    if (!refreshTokenOverride) {
      await this.persistRefreshToken(refreshToken, user._id);
    }

    const accessToken = await this.jwt.signAsync({
      sub: user._id,
      email: user.email,
      role: user.role,
      typ: 'access',
    });

    return {
      accessToken,
      refreshToken,
      // Timestamp d'expiration en millisecondes (consommé par le client).
      expiresAt: Date.now() + accessTtlSeconds * 1000,
      user: toUserDto(user),
    };
  }

  private async persistRefreshToken(token: string, userId: string): Promise<void> {
    const refreshTtlSeconds = this.config.get<number>('jwt.refreshTtlSeconds') ?? 604800;
    await this.refreshTokens.create({
      _id: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
    });
  }
}

export function toUserDto(user: User & { _id: string }): UserDto {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    company: user.company,
    avatarColor: user.avatarColor,
  };
}

export type { AuthUser };
