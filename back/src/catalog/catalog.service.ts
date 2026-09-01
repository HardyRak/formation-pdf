import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiException } from '../common/api-exception';
import type { FormationDto, LevelDto, StreamDto, TrainingDocumentDto } from '../common/contracts';
import { Formation, FormationDocument } from './formation.schema';
import { Level, LevelDocument } from './level.schema';
import { TrainingDocumentModel, TrainingDocumentDocument } from './document.schema';
import { toFormationDto, toLevelDto, toTrainingDocumentDto } from './catalog.mapper';

/**
 * Lecture du catalogue. Le contenu (`pages`) n'est jamais renvoyé dans les
 * listes : seule la route `/documents/:id/stream` (protégée) l'expose.
 */
@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Formation.name) private readonly formations: Model<FormationDocument>,
    @InjectModel(Level.name) private readonly levels: Model<LevelDocument>,
    @InjectModel(TrainingDocumentModel.name)
    private readonly documents: Model<TrainingDocumentDocument>,
  ) {}

  async listFormations(): Promise<FormationDto[]> {
    const items = await this.formations.find().sort({ order: 1 }).lean();
    return items.map(toFormationDto);
  }

  async listLevels(formationId: string): Promise<LevelDto[]> {
    const formation = await this.formations.findById(formationId).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');
    const items = await this.levels.find({ formationId }).sort({ order: 1 }).lean();
    return items.map(toLevelDto);
  }

  async listDocuments(levelId: string): Promise<TrainingDocumentDto[]> {
    const level = await this.levels.findById(levelId).lean();
    if (!level) throw new ApiException(404, 'NOT_FOUND', 'Niveau introuvable.');
    const items = await this.documents
      .find({ levelId }, { pages: 0 })
      .sort({ order: 1 })
      .lean();
    return items.map(toTrainingDocumentDto);
  }

  async getDocument(documentId: string): Promise<TrainingDocumentDto> {
    const document = await this.documents.findById(documentId, { pages: 0 }).lean();
    if (!document) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    return toTrainingDocumentDto(document);
  }

  async stream(documentId: string): Promise<StreamDto> {
    const document = await this.documents.findById(documentId).lean();
    if (!document) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    return { documentId: document._id, pages: document.pages ?? [] };
  }

  // ---- Résolutions utilisées par les guards d'accès ----------------

  async findLevel(levelId: string): Promise<(Level & { _id: string }) | null> {
    return this.levels.findById(levelId).lean();
  }

  async findDocument(
    documentId: string,
  ): Promise<(TrainingDocumentModel & { _id: string }) | null> {
    return this.documents.findById(documentId).lean();
  }
}
