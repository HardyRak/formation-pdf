import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Formation, FormationDocument } from '../catalog/formation.schema';
import { Level, LevelDocument } from '../catalog/level.schema';
import {
  TrainingDocumentModel,
  TrainingDocumentDocument,
} from '../catalog/document.schema';
import { AccessService } from '../access/access.service';

export interface FormationStats {
  formationId: string;
  documents: number;
}

export interface AdminStatsDto {
  users: number;
  managers: number;
  learners: number;
  formations: number;
  levels: number;
  documents: number;
  grants: number;
  perFormation: FormationStats[];
}

/**
 * Agrégations du tableau de bord d'administration.
 * Isole les requêtes d'agrégation du CRUD pour que chaque service admin reste
 * focalisé sur une responsabilité.
 */
@Injectable()
export class AdminStatsService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Formation.name) private readonly formations: Model<FormationDocument>,
    @InjectModel(Level.name) private readonly levels: Model<LevelDocument>,
    @InjectModel(TrainingDocumentModel.name)
    private readonly documents: Model<TrainingDocumentDocument>,
    private readonly access: AccessService,
  ) {}

  async stats(): Promise<AdminStatsDto> {
    const [users, managers, learners, formations, levels, documents, grants] =
      await Promise.all([
        this.users.countDocuments(),
        this.users.countDocuments({ role: 'MANAGER' }),
        this.users.countDocuments({ role: 'LEARNER' }),
        this.formations.countDocuments(),
        this.levels.countDocuments(),
        this.documents.countDocuments(),
        this.access.listGrants(),
      ]);

    // Nombre de documents par formation (pour le tableau de bord).
    const formationDocs = await this.documents
      .find({}, { levelId: 1, formationId: 1 })
      .lean();
    const formationIds = Array.from(
      new Set(formationDocs.map((d) => d.formationId)),
    );
    const perFormation: FormationStats[] = formationIds.map((formationId) => ({
      formationId,
      documents: formationDocs.filter((d) => d.formationId === formationId).length,
    }));

    return {
      users,
      managers,
      learners,
      formations,
      levels,
      documents,
      grants: grants.length,
      perFormation,
    };
  }
}
