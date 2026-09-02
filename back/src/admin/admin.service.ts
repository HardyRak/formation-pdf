import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import { ApiException } from '../common/api-exception';
import type { UserDto } from '../common/contracts';
import { User, UserDocument } from '../users/user.schema';
import { hashPassword } from '../auth/password.util';
import { toUserDto } from '../auth/auth.service';
import { AccessService } from '../access/access.service';
import { Formation, FormationDocument } from '../catalog/formation.schema';
import { Level, LevelDocument } from '../catalog/level.schema';
import { Category, CategoryDocument } from '../catalog/category.schema';
import {
  TrainingDocumentModel,
  TrainingDocumentDocument,
} from '../catalog/document.schema';
import { getUploadDir } from './uploads';

type AnyDoc = Record<string, unknown> & { _id: string };

/** Document lean + alias `id` attendu par le back-office (contrat DTO). */
type AdminDoc = AnyDoc & { id: string };

/** Les documents Mongoose lean portent `_id` ; le back-office lit `id`. */
function withId(doc: AnyDoc): AdminDoc {
  return { ...doc, id: doc._id };
}

/** Réponse générique d'un CRUD admin. */
export interface AdminList<T> {
  total: number;
  items: T[];
}

/**
 * Services d'administration du back-office.
 *
 * - Utilisateurs : création / édition / soft-disable (champ `active`).
 * - Accès : attribution d'un document (cascade niveau + formation), révocation.
 * - Catalogue : CRUD formations / niveaux / documents.
 * - PDF : import d'un `.pdf` sur volume + comptage de pages (pdf-lib).
 * - Statistiques du tableau de bord.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Formation.name) private readonly formations: Model<FormationDocument>,
    @InjectModel(Level.name) private readonly levels: Model<LevelDocument>,
    @InjectModel(TrainingDocumentModel.name)
    private readonly documents: Model<TrainingDocumentDocument>,
    @InjectModel(Category.name) private readonly categories: Model<CategoryDocument>,
    private readonly access: AccessService,
  ) {}

  // ---- Utilisateurs -----------------------------------------------------

  async listUsers(query?: string, role?: string): Promise<AdminList<UserDto>> {
    const filter: Record<string, unknown> = {};
    if (role && (role === 'LEARNER' || role === 'MANAGER')) filter.role = role;
    if (query) {
      const re = new RegExp(query.trim(), 'i');
      filter.$or = [{ email: re }, { firstName: re }, { lastName: re }, { company: re }];
    }
    const users = await this.users.find(filter).sort({ createdAt: -1 }).lean();
    return { total: users.length, items: users.map((u) => this.toUserDto(u)) };
  }

  async getUser(id: string): Promise<UserDto> {
    const user = await this.users.findById(id).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');
    return this.toUserDto(user);
  }

  async createUser(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'LEARNER' | 'MANAGER';
    company?: string;
    avatarColor?: string;
  }): Promise<UserDto> {
    const email = input.email.trim().toLowerCase();
    const exists = await this.users.findOne({ email }).lean();
    if (exists) {
      throw new ApiException(409, 'CONFLICT', 'Un compte existe déjà avec cet email.');
    }
    const passwordHash = await hashPassword(input.password);
    const _id = `usr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await this.users.create({
      _id,
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      company: input.company ?? '',
      avatarColor: input.avatarColor ?? '#4F46E5',
      active: true,
    });
    return this.toUserDto((await this.users.findById(_id).lean()) as AnyDoc);
  }

  async updateUser(
    id: string,
    input: Partial<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: 'LEARNER' | 'MANAGER';
      company: string;
      avatarColor: string;
      active: boolean;
    }>,
  ): Promise<UserDto> {
    const user = await this.users.findById(id).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');

    const patch: Record<string, unknown> = {};
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      const clash = await this.users.findOne({ email, _id: { $ne: id } }).lean();
      if (clash) {
        throw new ApiException(409, 'CONFLICT', 'Un compte existe déjà avec cet email.');
      }
      patch.email = email;
    }
    if (input.firstName !== undefined) patch.firstName = input.firstName;
    if (input.lastName !== undefined) patch.lastName = input.lastName;
    if (input.role !== undefined) patch.role = input.role;
    if (input.company !== undefined) patch.company = input.company;
    if (input.avatarColor !== undefined) patch.avatarColor = input.avatarColor;
    if (input.active !== undefined) patch.active = input.active;
    if (input.password !== undefined) {
      patch.passwordHash = await hashPassword(input.password);
    }

    await this.users.updateOne({ _id: id }, { $set: patch });
    return this.toUserDto((await this.users.findById(id).lean()) as AnyDoc);
  }

  async setActive(id: string, active: boolean): Promise<UserDto> {
    const user = await this.users.findById(id).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');
    await this.users.updateOne({ _id: id }, { $set: { active } });
    return this.toUserDto((await this.users.findById(id).lean()) as AnyDoc);
  }

  // ---- Accès --------------------------------------------------------------

  async listGrants(userId?: string): Promise<AnyDoc[]> {
    return this.access.listGrants(userId);
  }

  async grantDocument(userId: string, formationId: string, levelIds: string[], documentIds: string[]) {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');
    const formation = await this.formations.findById(formationId).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');

    // Cascade : si des documents sont fournis, on récupère leurs niveaux et on
    // les ajoute aux `levelIds`.
    let effectiveLevels = [...levelIds];
    const effectiveDocs = [...documentIds];
    if (effectiveDocs.length > 0) {
      const docs = await this.documents.find({ _id: { $in: effectiveDocs } }).lean();
      const levelIdSet = new Set(effectiveLevels);
      for (const doc of docs) {
        if (doc.formationId !== formationId) {
          throw new ApiException(400, 'INVALID', 'Un document n\'appartient pas à cette formation.');
        }
        levelIdSet.add(doc.levelId);
      }
      effectiveLevels = Array.from(levelIdSet);
    }

    return this.access.upsertGrant(userId, formationId, effectiveLevels, effectiveDocs);
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

  // ---- Documents (titres en lot) --------------------------------------------

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

  // ---- Catégories ----------------------------------------------------------

  async listCategories(): Promise<AdminDoc[]> {
    const rows = (await this.categories.find().sort({ order: 1, name: 1 }).lean()) as AnyDoc[];
    return rows.map(withId);
  }

  /**
   * Trouve la catégorie par son nom (insensible à la casse) ou la crée.
   * Utilisé à la création/édition d'une formation pour que la « nouvelle
   * catégorie » saisie dans la ComboBox devienne une entité en base.
   * Retourne le nom canonique (celui réellement enregistré).
   */
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

  // ---- Formations ---------------------------------------------------------

  async listFormations(): Promise<AdminDoc[]> {
    const rows = (await this.formations.find().sort({ order: 1 }).lean()) as AnyDoc[];
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
    const _id = `f-${slug(input.name)}-${count + 1}`;
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

  async updateFormation(
    id: string,
    input: Record<string, unknown>,
  ): Promise<AnyDoc> {
    const formation = await this.formations.findById(id).lean();
    if (!formation) throw new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');
    const patch: Record<string, unknown> = { ...input };
    // Si la catégorie change, on s'assure qu'elle existe (création à la volée).
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

  async listLevels(formationId: string): Promise<AnyDoc[]> {
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
    const _id = `l-${formationId.slice(2)}-${count + 1}`;
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

  async listDocuments(levelId: string): Promise<AnyDoc[]> {
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

  /** Crée un document et lui attache un fichier PDF (à partir de l'upload). */
  async createDocumentWithFile(
    levelId: string,
    input: { title: string; description?: string; order?: number },
    file?: Express.Multer.File,
  ): Promise<AnyDoc> {
    const level = await this.levels.findById(levelId).lean();
    if (!level) throw new ApiException(404, 'NOT_FOUND', 'Niveau introuvable.');
    const count = await this.documents.countDocuments({ levelId });
    const _id = `doc-${levelId.slice(2)}-${count + 1}`;

    const fileMeta = await this.initFileMeta(file);
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

  /** Remplace le fichier PDF d'un document (mise à jour des métadonnées). */
  async replaceDocumentFile(id: string, file: Express.Multer.File): Promise<AnyDoc> {
    const doc = await this.documents.findById(id).lean();
    if (!doc) throw new ApiException(404, 'NOT_FOUND', 'Document introuvable.');
    const fileMeta = await this.initFileMeta(file);

    // On supprime l'ancien fichier (s'il en existait un).
    if (doc.filePath) this.removeFile(doc.filePath as string);

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
    if (doc.filePath) this.removeFile(doc.filePath as string);
    await this.documents.deleteOne({ _id: id });
    if (doc.levelId) await this.refreshLevelCounters(doc.levelId as string);
    return { success: true };
  }

  // ---- Statistiques -----------------------------------------------------------

  async stats() {
    const [users, formations, documents, levels, grants] = await Promise.all([
      this.users.countDocuments(),
      this.formations.countDocuments(),
      this.documents.countDocuments(),
      this.levels.countDocuments(),
      this.access.listGrants(),
    ]);

    // Complétion par formation (documents terminés / documents total).
    const formationDocs = await this.documents
      .find({}, { levelId: 1, formationId: 1 })
      .lean();
    const formationIds = Array.from(
      new Set(formationDocs.map((d) => d.formationId)),
    );
    const perFormation = await Promise.all(
      formationIds.map(async (formationId) => {
        const docs = formationDocs.filter((d) => d.formationId === formationId);
        return { formationId, documents: docs.length };
      }),
    );

    return {
      users,
      managers: await this.users.countDocuments({ role: 'MANAGER' }),
      learners: await this.users.countDocuments({ role: 'LEARNER' }),
      formations,
      levels,
      documents,
      grants: grants.length,
      perFormation,
    };
  }

  // ---- Helpers internes ---------------------------------------------------------

  private toUserDto(doc: AnyDoc): UserDto {
    return {
      id: doc._id as string,
      email: doc.email as string,
      firstName: doc.firstName as string,
      lastName: doc.lastName as string,
      role: doc.role as 'LEARNER' | 'MANAGER',
      company: (doc.company as string) ?? '',
      avatarColor: (doc.avatarColor as string) ?? '#4F46E5',
    };
  }

  /** Compte les pages et calcule l'empreinte d'un PDF importé. */
  private async initFileMeta(
    file?: Express.Multer.File,
  ): Promise<{
    filePath: string;
    originalFilename: string;
    mimeType: string;
    sha256: string;
    pageCount: number;
    sizeKb: number;
  }> {
    const empty = {
      filePath: '',
      originalFilename: '',
      mimeType: 'application/pdf',
      sha256: '',
      pageCount: 0,
      sizeKb: 0,
    };
    if (!file) return empty;

    const filePath = `${file.path}`;
    // Le fichier a été écrit sur disque (diskStorage) : on relit le contenu.
    const bytes = existsSync(file.path)
      ? new Uint8Array(readFileSync(file.path))
      : new Uint8Array();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const sizeKb = Math.max(1, Math.round((file.size ?? bytes.byteLength) / 1024));
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      return {
        filePath,
        originalFilename: file.originalname,
        mimeType: file.mimetype || 'application/pdf',
        sha256,
        pageCount: pdf.getPageCount(),
        sizeKb,
      };
    } catch {
      // Fichier non-PDF ou corrompu : on garde les métadonnées mais pageCount=0.
      return {
        filePath,
        originalFilename: file.originalname,
        mimeType: file.mimetype || 'application/pdf',
        sha256,
        pageCount: 0,
        sizeKb,
      };
    }
  }

  private removeFile(relativePath: string): void {
    try {
      const dir = getUploadDir();
      const absolute = `${dir.replace(/[/\\]+$/, '')}/${relativePath.replace(/[/\\]+$/, '')}`;
      if (existsSync(absolute)) unlinkSync(absolute);
    } catch {
      /* best effort */
    }
  }

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

/** Slugifie un nom pour générer un identifiant métier. */
function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Échappe les caractères spéciaux d'une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Identifiant court et unique (suffixe aléatoire) pour éviter toute collision
 * de clé lors de créations parallèles (le `count+1` ne le garantit pas).
 */
function shortId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
