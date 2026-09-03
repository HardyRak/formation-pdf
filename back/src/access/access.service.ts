import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AccessSummaryDto } from '../common/contracts';
import type { AuthUser } from '../common/auth-user';
import { AccessGrant, AccessGrantDocument } from './access-grant.schema';

/** Document « lean » minimal utilisé pour l'évaluation des droits. */
export interface AccessibleDocument {
  _id: string;
  formationId: string;
  levelId: string;
}

/** Document Mongoose « lean » (objet plat). */
type AnyDoc = Record<string, unknown> & { _id: string };

/**
 * Complète un grant « lean » ancien auquel il manquerait les champs tableau
 * (`levelIds` / `documentIds`) : les `default: []` du schéma ne s'appliquent
 * qu'à la création, pas aux documents déjà en base (pré-migration).
 */
function withDefaults(grant: AnyDoc): AnyDoc {
  return {
    ...grant,
    levelIds: (grant.levelIds as string[] | undefined) ?? [],
    documentIds: (grant.documentIds as string[] | undefined) ?? [],
  };
}

/**
 * Contrôle d'accès serveur (source de vérité).
 *
 * Politique :
 *  - MANAGER  → accès total (aucun grant nécessaire).
 *  - LEARNER  → accès défini par les documents `access_grants`.
 *
 * Granularité (voir schéma AccessGrant) :
 *  - `levelIds` vide  → accès à TOUS les niveaux de la formation.
 *  - `documentIds` vide → accès à TOUS les documents des niveaux autorisés.
 *  - `documentIds` renseigné → accès fin aux documents indiqués ; le niveau et
 *    la formation correspondants deviennent aussi accessibles (cascade).
 *
 * Les métadonnées du catalogue (formations/niveaux) sont publiques pour un
 * utilisateur authentifié (affichage grisé + cadenas côté client).
 * Le CONTENU (documents + stream) est protégé ici par un 403.
 */
@Injectable()
export class AccessService {
  constructor(
    @InjectModel(AccessGrant.name)
    private readonly grants: Model<AccessGrantDocument>,
  ) {}

  // ---- Lecture / droit d'accès ----------------------------------------

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
    const grant = await this.findById(user.id, formationId);
    if (!grant) return false;
    // levelIds vide = accès à tous les niveaux de la formation.
    return grant.levelIds.length === 0 || grant.levelIds.includes(levelId);
  }

  /** Droit de lire un document : formation + niveau accessibles ET document couvert. */
  async canReadDocument(user: AuthUser, document: AccessibleDocument): Promise<boolean> {
    if (user.role === 'MANAGER') return true;
    const grant = await this.findById(user.id, document.formationId);
    if (!grant) return false;
    const levelOk =
      grant.levelIds.length === 0 || grant.levelIds.includes(document.levelId);
    if (!levelOk) return false;
    // documentIds vide = tous les documents du niveau ; sinon le doc doit être listé.
    return grant.documentIds.length === 0 || grant.documentIds.includes(document._id);
  }

  /** Résumé des droits, consommé par le client (remplace le access.ts codé en dur). */
  async grantsFor(user: AuthUser): Promise<AccessSummaryDto> {
    if (user.role === 'MANAGER') {
      return { role: 'MANAGER', formations: ['*'], levels: { '*': ['*'] } };
    }
    const grants = (await this.grants.find({ userId: user.id }).lean()) as AnyDoc[];
    const formations = grants.map((g) => String(g.formationId));
    const levels: Record<string, string[]> = {};
    for (const grant of grants) {
      levels[String(grant.formationId)] = withDefaults(grant).levelIds as string[];
    }
    return { role: user.role, formations, levels };
  }

  // ---- Administration (utilisé par /admin) -----------------------------

  /** Liste des grants (admin). */
  async listGrants(userId?: string): Promise<AnyDoc[]> {
    const filter = userId ? { userId } : {};
    const rows = (await this.grants.find(filter).sort({ formationId: 1 }).lean()) as AnyDoc[];
    return rows.map(withDefaults);
  }

  /**
   * Upsert fusionné d'un grant pour un couple user/formation.
   * Idempotent : les niveaux et documents sont fusionnés (union).
   *
   * Règles de fusion (voir §README sémantique) :
   *  - `levelIds` vide OU grant existant tout-niveaux ⇒ grant « tous niveaux »
   *    (et donc `documentIds` vidé, car le niveau couvre tout le contenu).
   *  - sinon union des `levelIds` ; `documentIds` vide = tous les documents,
   *    sinon union.
   */
  async upsertGrant(
    userId: string,
    formationId: string,
    levelIds: string[],
    documentIds: string[],
  ): Promise<AnyDoc> {
    const _id = `${userId}:${formationId}`;
    const existing = (await this.grants.findById(_id).lean()) as AnyDoc | null;

    const incomingLevels = Array.from(new Set(levelIds));
    const incomingDocs = Array.from(new Set(documentIds));
    const hasExisting = !!existing;
    const currentLevels = (existing?.levelIds as string[] | undefined) ?? [];
    const currentDocs = (existing?.documentIds as string[] | undefined) ?? [];

    // `levelIds` vide = « tous les niveaux » → le grant couvre toute la formation.
    // Un grant EXISTANT avec `levelIds=[]` reste « tous niveaux » (déjà complet).
    const levelAll =
      incomingLevels.length === 0 || (hasExisting && currentLevels.length === 0);

    // Fusion des niveaux (uniquement si pas de couverture « tous niveaux »).
    const mergedLevels = levelAll
      ? []
      : Array.from(new Set([...currentLevels, ...incomingLevels]));

    // `documentIds` vide = « tous les documents des niveaux autorisés ».
    // Un grant EXISTANT avec `documentIds=[]` reste « tous documents ».
    const docsAll =
      incomingDocs.length === 0 || (hasExisting && currentDocs.length === 0);
    const mergedDocs =
      levelAll || docsAll
        ? []
        : Array.from(new Set([...currentDocs, ...incomingDocs]));

    const saved = await this.grants.findOneAndUpdate(
      { _id },
      {
        $set: {
          userId,
          formationId,
          levelIds: mergedLevels,
          documentIds: mergedDocs,
        },
      },
      { upsert: true, new: true, lean: true },
    );
    return saved as AnyDoc;
  }

  /** Révoque l'accès d'un utilisateur à une formation entière. */
  async revokeGrant(userId: string, formationId: string): Promise<boolean> {
    const result = await this.grants.deleteOne({ _id: `${userId}:${formationId}` });
    return (result.deletedCount ?? 0) > 0;
  }

  /** Retire un document précis d'un grant. */
  async revokeDocument(userId: string, documentId: string): Promise<boolean> {
    const grant = await this.findOneDocument(userId, documentId);
    if (!grant) return false;

    const nextDocs = ((grant.documentIds as string[]) ?? []).filter(
      (id) => id !== documentId,
    );
    if (nextDocs.length > 0) {
      // Il reste d'autres documents octroyés : on retire simplement le document.
      await this.grants.updateOne(
        { _id: grant._id as string },
        { $set: { documentIds: nextDocs } },
      );
      return true;
    }

    // C'était le dernier document octroyé. On ne peut PAS écrire
    // `documentIds: []` : la sémantique du projet est « documentIds vide = tous
    // les documents du niveau ». Révouer le dernier document en écrivant `[]`
    // ré-ouvrirait tout le niveau (escalade de privilège). On révoque donc le
    // grant entier, ce qui retire l'accès à ce document (et à son niveau si
    // celui-ci n'était ouvert que par cascade).
    return this.revokeGrant(userId, grant.formationId as string);
  }

  // ---- Helpers ---------------------------------------------------------

  private async findById(
    userId: string,
    formationId: string,
  ): Promise<(AccessGrant & { _id: string }) | null> {
    const row = (await this.grants
      .findById(`${userId}:${formationId}`)
      .lean()) as AnyDoc | null;
    return row ? (withDefaults(row) as unknown as AccessGrant & { _id: string }) : null;
  }

  private async findOneDocument(
    userId: string,
    documentId: string,
  ): Promise<AnyDoc | null> {
    const row = (await this.grants
      .findOne({ userId, documentIds: documentId })
      .lean()) as AnyDoc | null;
    return row ? withDefaults(row) : null;
  }
}
