import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AccessSummaryDto } from '../common/contracts';
import type { AuthUser } from '../common/auth-user';
import { AccessGrant, AccessGrantDocument } from './access-grant.schema';

/**
 * Contrôle d'accès serveur (source de vérité).
 *
 * Politique :
 *  - MANAGER  → accès total (aucun grant nécessaire).
 *  - LEARNER  → accès défini par les documents `access_grants`.
 *
 * Les métadonnées du catalogue (formations/niveaux) sont publiques pour un
 * utilisateur authentifié (le client les affiche grisées + cadenas).
 * Le CONTENU (documents + stream) est protégé ici par un 403.
 */
@Injectable()
export class AccessService {
  constructor(
    @InjectModel(AccessGrant.name)
    private readonly grants: Model<AccessGrantDocument>,
  ) {}

  async canReadFormation(user: AuthUser, formationId: string): Promise<boolean> {
    if (user.role === 'MANAGER') return true;
    return (await this.grants.exists({ userId: user.id, formationId })) !== null;
  }

  async canReadLevel(
    user: AuthUser,
    formationId: string,
    levelId: string,
  ): Promise<boolean> {
    if (user.role === 'MANAGER') return true;
    const grant = await this.grants.findOne({ userId: user.id, formationId }).lean();
    if (!grant) return false;
    // levelIds vide = accès à tous les niveaux de la formation.
    return grant.levelIds.length === 0 || grant.levelIds.includes(levelId);
  }

  /** Résumé des droits, consommé par le client (remplace le access.ts codé en dur). */
  async grantsFor(user: AuthUser): Promise<AccessSummaryDto> {
    if (user.role === 'MANAGER') {
      return { role: 'MANAGER', formations: ['*'], levels: { '*': ['*'] } };
    }
    const grants = await this.grants.find({ userId: user.id }).lean();
    const formations = grants.map((g) => g.formationId);
    const levels: Record<string, string[]> = {};
    for (const grant of grants) {
      levels[grant.formationId] = grant.levelIds;
    }
    return { role: user.role, formations, levels };
  }
}
