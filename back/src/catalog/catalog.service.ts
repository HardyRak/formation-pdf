import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ApiException } from '../common/api-exception';
import { escapeRegex } from '../common/id.util';
import type {
  FormationCategoryDto,
  FormationPageDto,
  LevelDto,
  StreamDto,
  TrainingDocumentDto,
} from '../common/contracts';
import { Formation, FormationDocument } from './formation.schema';
import { Category, CategoryDocument } from './category.schema';
import { Level, LevelDocument } from './level.schema';
import { TrainingDocumentModel, TrainingDocumentDocument } from './document.schema';
import { toFormationDto, toLevelDto, toTrainingDocumentDto } from './catalog.mapper';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

/**
 * Lecture du catalogue. Le contenu (`pages`) n'est jamais renvoyé dans les
 * listes : seule la route `/documents/:id/stream` (protégée) l'expose.
 */
@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Formation.name) private readonly formations: Model<FormationDocument>,
    @InjectModel(Category.name) private readonly categories: Model<CategoryDocument>,
    @InjectModel(Level.name) private readonly levels: Model<LevelDocument>,
    @InjectModel(TrainingDocumentModel.name)
    private readonly documents: Model<TrainingDocumentDocument>,
  ) {}

  /**
   * Liste paginée du catalogue : recherche plein texte et filtre catégorie
   * appliqués en base (le client mobile charge page par page).
   */
  async listFormations(
    options: { q?: string; category?: string; page?: number; limit?: number } = {},
  ): Promise<FormationPageDto> {
    const page = options.page && options.page > 0 ? options.page : DEFAULT_PAGE;
    const limit = options.limit && options.limit > 0 ? options.limit : DEFAULT_LIMIT;

    const filter: FilterQuery<FormationDocument> = {};

    const category = options.category?.trim();
    if (category) {
      filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
    }

    const term = options.q?.trim();
    if (term) {
      const regex = { $regex: escapeRegex(term), $options: 'i' };
      filter.$or = [{ name: regex }, { description: regex }, { category: regex }];
    }

    const [items, total] = await Promise.all([
      this.formations
        .find(filter)
        .sort({ order: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.formations.countDocuments(filter),
    ]);

    return {
      items: items.map(toFormationDto),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  /**
   * Catégories proposées comme filtre.
   *
   * La collection `categories` est le référentiel qui fait autorité (géré en
   * back-office) : elle fixe la liste ET l'ordre d'affichage. Les compteurs
   * sont joints depuis les formations en une seule agrégation (pas de N+1).
   */
  async listCategories(): Promise<FormationCategoryDto[]> {
    const [referential, counts] = await Promise.all([
      this.categories.find().sort({ order: 1, name: 1 }).lean(),
      this.formations.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    // Indexation insensible à la casse : `Formation.category` est une chaîne
    // libre historique, elle peut différer du référentiel sur la casse.
    const countByName = new Map<string, number>();
    counts.forEach((row) => {
      if (typeof row._id !== 'string' || !row._id) return;
      const key = row._id.toLowerCase();
      countByName.set(key, (countByName.get(key) ?? 0) + row.count);
    });

    return referential.map((category) => ({
      name: category.name,
      count: countByName.get(category.name.toLowerCase()) ?? 0,
    }));
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
