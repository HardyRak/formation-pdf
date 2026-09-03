import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiException } from '../common/api-exception';
import { slug, escapeRegex, shortId } from '../common/id.util';
import { Formation, FormationDocument } from '../catalog/formation.schema';
import { Level, LevelDocument } from '../catalog/level.schema';
import { Category, CategoryDocument } from '../catalog/category.schema';
import {
  TrainingDocumentModel,
  TrainingDocumentDocument,
} from '../catalog/document.schema';
import { computePdfFileMeta, removePdfFile } from './pdf.util';
import type { AdminDoc, AnyDoc, PdfFileMeta } from './admin.types';
import { withId } from './admin.types';

/**
 * CRUD du catalogue (formations / niveaux / documents / catégories) + PDF.
 *
 * - Les compteurs de formation et de niveau sont **recalculés** à chaque
 *   mutation afin de rester cohérents avec le catalogue exposé au mobile.
 * - L'import/remplacement d'un `.pdf` passe par `computePdfFileMeta` (empreinte
 *   SHA-256, taille, nombre de pages) ; la suppression d'un document purge
 *   aussi le fichier du volume.
 * - `documentTitles` résout un lot de titres en une seule requête (évite les
 *   N+1 côté back-office).
 */
@Injectable()
export class AdminCatalogService {
  constructor(
    @InjectModel(Formation.name) private readonly formations: Model<FormationDocument>,
    @InjectModel(Level.name) private readonly levels: Model<LevelDocument>,
    @InjectModel(TrainingDocumentModel.name)
    private readonly documents: Model<TrainingDocumentDocument>,
    @InjectModel(Category.name) private readonly categories: Model<CategoryDocument>,
  ) {}

  // ---- Catégories ---------------------------------------------------------

  async listCategories(): Promise<AdminDoc[]> {
    const rows = (await this.categories.find().sort({ order: 1, name: 1 }).lean()) as AnyDoc[];
    return rows.map(withId);
  }

  async createCategory(input: { name: string }): Promise<AnyDoc> {
    const name = input.name.trim();
    if (!name) throw new ApiException(400, 'INVALID', 'Le nom de catégorie est requis.');
    const dup = await this.categories
      .findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } })
      .lean();
    if (dup) throw new ApiException(409, 'CONFLICT', 'Cette catégorie existe déjà.');
    const count = await this.categories.countDocuments();
    const _id = `cat-${slug(name)}-${shortId()}`;
    await this.categories.create({ _id, name, order: count + 1 });
    return (await this.categories.findById(_id).lean()) as AnyDoc;
  }

  /** Renommage : met aussi à jour le champ `category` de toutes les formations. */
  async renameCategory(id: string, input: { name?: string }): Promise<AnyDoc> {
    const category = await this.categories.findById(id).lean();
    if (!category) throw new ApiException(404, 'NOT_FOUND', 'Catégorie introuvable.');
    const oldName = category.name as string;
    const name = (input.name ?? '').trim();
    if (!name) throw new ApiException(400, 'INVALID', 'Le nom de catégorie est requis.');
    const dup = await this.categories
      .findOne({ _id: { $ne: id }, name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } })
      .lean();
    if (dup) throw new ApiException(409, 'CONFLICT', 'Une catégorie porte déjà ce nom.');

    await this.categories.updateOne({ _id: id }, { $set: { name } });
    if (name !== oldName) {
      await this.formations.updateMany({ category: oldName }, { $set: { category: name } });
    }
    return (await this.categories.findById(id).lean()) as AnyDoc;
  }

  /** Suppression refusée si des formations utilisent encore la catégorie. */
  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const category = await this.categories.findById(id).lean();
    if (!category) throw new ApiException(404, 'NOT_FOUND', 'Catégorie introuvable.');
    const inUse = await this.formations.countDocuments({ category: category.name as string });
    if (inUse > 0) {
      throw new ApiException(
        409,
        'CONFLICT',
        `Catégorie utilisée par ${inUse} formation(s) ; renommez-les d'abord.`,
      );
    }
    await this.categories.deleteOne({ _id: id });
    return { success: true };
  }

  /** Trouve la catégorie par son nom (insensible à la casse) ou la crée. */
  private async ensureCategory(rawName: string): Promise<string> {
    const name = rawName.trim();
    if (!name) return name;
    const existing = await this.categories
      .findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } })
      .lean();
    if (existing) return (existing.name as string) ?? name;
    const count = await this.categories.countDocuments();
    const _id = `cat-${slug(name)}-${shortId()}`;
    await this.categories.create({ _id, name, order: count + 1 });
    return name;
  }

  // ---- Formations ---------------------------------------------------------

  async listFormations(q?: string): Promise<AdminDoc[]> {
    const filter = q?.trim()
      ? { name: { $regex: new RegExp(escapeRegex(q.trim()), 'i') } }
      : {};
    const rows = (await this.formations.find(filter).sort({ order: 1 }).lean()) as AnyDoc[];
    return rows.map(withId);
  }

  async createFormation(input: {
    name: string;
    description: string;
    category: string;
    icon: string;
    color: string;
    mandatory?: boolean;
    order?: number;
  }): Promise<AnyDoc> {
    const count = await this.formations.countDocuments();
    let _id = `f-${slug(input.name)}-${count + 1}`;
    if (await this.formations.findById(_id).lean()) {
      _id = `f-${slug(input.name)}-${count + 1}-${shortId()}`;
    }
    // La catégorie saisie (nouvelle ou existante) devient une entité en base.
    const category = await this.ensureCategory(input.category);
    await this.formations.create({
      _id,
      name: input.name,
      description: input.description,
      category,
      icon: input.icon,
      color: input.color,
      mandatory: input.mandatory ?? false,
      order: input.order ?? (await this.formations.countDocuments()) + 1,
      levelsCount: 0,
      documentsCount: 0,
      totalPages: 0,
      durationMinutes: 0,
    });
    return (await this.formations.findById(_id).lean()) as AnyDoc;
  }

  async updateFormation(id: string, input: Record<string, unknown>): Promise<AnyDoc> {
    const formation = await this.formations.findById(id).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');
    const patch: Record<string, unknown> = { ...input };
    if (typeof patch.category === 'string' && patch.category.trim()) {
      patch.category = await this.ensureCategory(patch.category as string);
    }
    await this.formations.updateOne({ _id: id }, { $set: patch });
    return (await this.formations.findById(id).lean()) as AnyDoc;
  }

  async deleteFormation(id: string): Promise<{ success: boolean }> {
    const formation = await this.formations.findById(id).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');
    // Suppression en cascade des niveaux + documents (et de leurs fichiers PDF).
    const levels = await this.levels.find({ formationId: id }).lean();
    for (const level of levels) {
      await this.deleteLevel(level._id);
    }
    await this.formations.deleteOne({ _id: id });
    return { success: true };
  }

  // ---- Niveaux -------------------------------------------------------------

  async listLevels(formationId: string): Promise<AdminDoc[]> {
    const formation = await this.formations.findById(formationId).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');
    const rows = (await this.levels.find({ formationId }).sort({ order: 1 }).lean()) as AnyDoc[];
    return rows.map(withId);
  }

  async createLevel(
    formationId: string,
    input: { name: string; description: string; order?: number },
  ): Promise<AnyDoc> {
    const formation = await this.formations.findById(formationId).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');
    const count = await this.levels.countDocuments({ formationId });
    const cleanFormationId = formationId.replace(/^f-/, '');
    let _id = `l-${cleanFormationId}-${count + 1}`;
    if (await this.levels.findById(_id).lean()) {
      _id = `l-${cleanFormationId}-${count + 1}-${shortId()}`;
    }
    await this.levels.create({
      _id,
      formationId,
      order: input.order ?? count + 1,
      name: input.name,
      description: input.description,
      documentsCount: 0,
      totalPages: 0,
    });
    await this.refreshFormationCounters(formationId);
    return (await this.levels.findById(_id).lean()) as AnyDoc;
  }

  async updateLevel(id: string, input: Record<string, unknown>): Promise<AnyDoc> {
    const level = await this.levels.findById(id).lean();
    if (!level) throw new ApiException(404, 'NOT_FOUND', 'Niveau introuvable.');
    await this.levels.updateOne({ _id: id }, { $set: input });
    const updated = (await this.levels.findById(id).lean()) as AnyDoc;
    await this.refreshFormationCounters(updated.formationId as string);
    return updated;
  }

  async deleteLevel(id: string): Promise<{ success: boolean }> {
    const level = await this.levels.findById(id).lean();
    if (!level) throw new ApiException(404, 'NOT_FOUND', 'Niveau introuvable.');
    const docs = await this.documents.find({ levelId: id }).lean();
    for (const doc of docs) {
      await this.deleteDocument(doc._id);
    }
    await this.levels.deleteOne({ _id: id });
    await this.refreshFormationCounters(level.formationId);
    return { success: true };
  }

  // ---- Documents + PDF -------------------------------------------------------

  async listDocuments(levelId: string): Promise<AdminDoc[]> {
    const level = await this.levels.findById(levelId).lean();
    if (!level) throw new ApiException(404, 'NOT_FOUND', 'Niveau introuvable.');
    const rows = (await this.documents
      .find({ levelId }, { pages: 0 })
      .sort({ order: 1 })
      .lean()) as AnyDoc[];
    return rows.map(withId);
  }

  async getDocument(id: string): Promise<AdminDoc> {
    const doc = await this.documents.findById(id, { pages: 0 }).lean();
    if (!doc) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    return withId(doc as AnyDoc);
  }

  async createDocumentWithFile(
    levelId: string,
    input: { title: string; description?: string; order?: number },
    file?: Express.Multer.File,
  ): Promise<AnyDoc> {
    const level = await this.levels.findById(levelId).lean();
    if (!level) throw new ApiException(404, 'NOT_FOUND', 'Niveau introuvable.');
    const count = await this.documents.countDocuments({ levelId });
    const cleanLevelId = levelId.replace(/^l-/, '');
    let _id = `doc-${cleanLevelId}-${count + 1}`;
    if (await this.documents.findById(_id).lean()) {
      _id = `doc-${cleanLevelId}-${count + 1}-${shortId()}`;
    }

    const fileMeta = await computePdfFileMeta(file);
    await this.documents.create({
      _id,
      levelId,
      formationId: level.formationId,
      order: input.order ?? count + 1,
      title: input.title,
      description: input.description ?? '',
      pageCount: fileMeta.pageCount,
      sizeKb: fileMeta.sizeKb,
      updatedAt: new Date(),
      filePath: fileMeta.filePath,
      originalFilename: fileMeta.originalFilename,
      mimeType: fileMeta.mimeType,
      sha256: fileMeta.sha256,
      pages: [],
    });

    await this.refreshLevelCounters(levelId);
    return (await this.documents.findById(_id, { pages: 0 }).lean()) as AnyDoc;
  }

  async updateDocument(id: string, input: Record<string, unknown>): Promise<AnyDoc> {
    const doc = await this.documents.findById(id).lean();
    if (!doc) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    const patch: Record<string, unknown> = { ...input };
    if (patch.updatedAt === undefined) patch.updatedAt = new Date();
    await this.documents.updateOne({ _id: id }, { $set: patch });
    if (doc.levelId) await this.refreshLevelCounters(doc.levelId as string);
    return (await this.documents.findById(id, { pages: 0 }).lean()) as AnyDoc;
  }

  async replaceDocumentFile(id: string, file: Express.Multer.File): Promise<AnyDoc> {
    const doc = await this.documents.findById(id).lean();
    if (!doc) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    const fileMeta: PdfFileMeta = await computePdfFileMeta(file);

    if (doc.filePath) removePdfFile(doc.filePath as string);

    await this.documents.updateOne(
      { _id: id },
      { $set: { ...fileMeta, updatedAt: new Date() } },
    );
    if (doc.levelId) await this.refreshLevelCounters(doc.levelId as string);
    return this.documents.findById(id, { pages: 0 }).lean() as Promise<AnyDoc>;
  }

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    const doc = await this.documents.findById(id).lean();
    if (!doc) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    if (doc.filePath) removePdfFile(doc.filePath as string);
    await this.documents.deleteOne({ _id: id });
    if (doc.levelId) await this.refreshLevelCounters(doc.levelId as string);
    return { success: true };
  }

  /**
   * Résout les titres d'un lot de documents en une seule requête (évite le
   * N+1 côté back-office lors de l'affichage des attributions d'accès).
   */
  async documentTitles(ids: string[]): Promise<Record<string, string>> {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return {};
    const docs = (await this.documents
      .find({ _id: { $in: unique } }, { title: 1 })
      .lean()) as Array<{ _id: string; title?: string }>;
    const map: Record<string, string> = {};
    for (const d of docs) map[d._id] = d.title ?? d._id;
    return map;
  }

  // ---- Helpers internes ---------------------------------------------------------

  private async refreshLevelCounters(levelId: string): Promise<void> {
    const docs = await this.documents.find({ levelId }).lean();
    const totalPages = docs.reduce((s, d) => s + (d.pageCount ?? 0), 0);
    await this.levels.updateOne(
      { _id: levelId },
      { $set: { documentsCount: docs.length, totalPages } },
    );
    const level = await this.levels.findById(levelId).lean();
    if (level) await this.refreshFormationCounters(level.formationId as string);
  }

  private async refreshFormationCounters(formationId: string): Promise<void> {
    const [levels, docs] = await Promise.all([
      this.levels.find({ formationId }).lean(),
      this.documents.find({ formationId }).lean(),
    ]);
    const totalPages = docs.reduce((s, d) => s + (d.pageCount ?? 0), 0);
    await this.formations.updateOne(
      { _id: formationId },
      {
        $set: {
          levelsCount: levels.length,
          documentsCount: docs.length,
          totalPages,
          durationMinutes: totalPages * 3,
        },
      },
    );
  }
}
