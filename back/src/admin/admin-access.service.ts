import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiException } from '../common/api-exception';
import { User, UserDocument } from '../users/user.schema';
import { Formation, FormationDocument } from '../catalog/formation.schema';
import {
  TrainingDocumentModel,
  TrainingDocumentDocument,
} from '../catalog/document.schema';
import { AccessService } from '../access/access.service';
import type { AnyDoc } from './admin.types';

/**
 * Attribution / révocation des droits d'accès à une formation (rôle MANAGER).
 *
 * Délègue la sémantique des grants à `AccessService`, en y ajoutant :
 *  - la vérification d'existence de l'utilisateur et de la formation ;
 *  - la **cascade** : octroyer un document ajoute automatiquement son niveau aux
 *    `levelIds` du grant (un document « ouvre » aussi son niveau et sa formation).
 */
@Injectable()
export class AdminAccessService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Formation.name) private readonly formations: Model<FormationDocument>,
    @InjectModel(TrainingDocumentModel.name)
    private readonly documents: Model<TrainingDocumentDocument>,
    private readonly access: AccessService,
  ) {}

  async listGrants(userId?: string): Promise<AnyDoc[]> {
    return this.access.listGrants(userId);
  }

  async grantDocument(
    userId: string,
    formationId: string,
    levelIds: string[],
    documentIds: string[],
  ): Promise<AnyDoc> {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');
    const formation = await this.formations.findById(formationId).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');

    // Cascade : si des documents sont fournis, on récupère leurs niveaux et on
    // les ajoute aux `levelIds`.
    const effectiveLevels = new Set(levelIds);
    const effectiveDocs = [...documentIds];
    if (effectiveDocs.length > 0) {
      const docs = await this.documents.find({ _id: { $in: effectiveDocs } }).lean();
      for (const doc of docs) {
        if (doc.formationId !== formationId) {
          throw new ApiException(400, 'INVALID', 'Un document n\'appartient pas à cette formation.');
        }
        effectiveLevels.add(doc.levelId);
      }
    }

    return this.access.upsertGrant(userId, formationId, Array.from(effectiveLevels), effectiveDocs);
  }

  async revokeGrant(userId: string, formationId: string): Promise<{ success: boolean }> {
    const ok = await this.access.revokeGrant(userId, formationId);
    if (!ok) throw new ApiException(404, 'NOT_FOUND', 'Accès introuvable.');
    return { success: true };
  }

  async revokeDocument(userId: string, documentId: string): Promise<{ success: boolean }> {
    const ok = await this.access.revokeDocument(userId, documentId);
    if (!ok) throw new ApiException(404, 'NOT_FOUND', 'Accès introuvable.');
    return { success: true };
  }
}
