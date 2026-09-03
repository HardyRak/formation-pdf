import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiException } from '../common/api-exception';
import { User, UserDocument } from '../users/user.schema';
import { toUserDto } from '../users/user.mapper';
import { Formation, FormationDocument } from '../catalog/formation.schema';
import {
  TrainingDocumentModel,
  TrainingDocumentDocument,
} from '../catalog/document.schema';
import {
  DocumentProgress,
  DocumentProgressDocument,
} from '../progression/document-progress.schema';
import { AccessService } from '../access/access.service';
import type {
  AnyDoc,
  LearnerFormationProgress,
  LearnerProgressDto,
} from './admin.types';

/**
 * Avancement d'un apprenant, agrégé par formation (back-office).
 *
 * Croise trois sources :
 *  - `access_grants`      → quelles formations/niveaux/documents sont accessibles ;
 *  - `documents`          → le volume (nombre de documents, de pages) ;
 *  - `document_progress`  → les pages réellement lues.
 *
 * Le pourcentage est pondéré par les pages (et non par document) pour rester
 * significatif quand les documents ont des tailles très différentes.
 *
 * Une formation est listée si l'apprenant y a un grant OU s'il y a une entrée
 * de progression (cas d'un accès révoqué après lecture : l'historique reste
 * visible, basé sur les seuls documents lus).
 */
@Injectable()
export class AdminProgressService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Formation.name) private readonly formations: Model<FormationDocument>,
    @InjectModel(TrainingDocumentModel.name)
    private readonly documents: Model<TrainingDocumentDocument>,
    @InjectModel(DocumentProgress.name)
    private readonly progress: Model<DocumentProgressDocument>,
    private readonly access: AccessService,
  ) {}

  async learnerProgress(userId: string): Promise<LearnerProgressDto> {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');

    const [grants, progressRows] = await Promise.all([
      this.access.listGrants(userId),
      this.progress.find({ userId }).lean(),
    ]);

    const formationIds = unionFormationIds(grants, progressRows);
    if (formationIds.length === 0) {
      return { user: toUserDto(user), formations: [], globalPercent: 0 };
    }

    const [catalogDocs, catalogFormations] = await Promise.all([
      this.documents
        .find({ formationId: { $in: formationIds } }, { formationId: 1, levelId: 1, pageCount: 1 })
        .lean(),
      this.formations.find({ _id: { $in: formationIds } }).lean(),
    ]);
    const formationById = new Map(
      catalogFormations.map((f) => [String(f._id), f as AnyDoc]),
    );

    const formations = formationIds.map((formationId) =>
      buildFormationProgress({
        formationId,
        formation: formationById.get(formationId),
        documents: catalogDocs.filter((d) => d.formationId === formationId),
        grant: grants.find((g) => String(g.formationId) === formationId),
        progressRows,
      }),
    );

    const totalPages = formations.reduce((sum, f) => sum + f.totalPages, 0);
    const pagesRead = formations.reduce((sum, f) => sum + f.pagesRead, 0);

    return {
      user: toUserDto(user),
      formations,
      globalPercent: percentOf(pagesRead, totalPages),
    };
  }
}

/** Union des formations couvertes par un grant ou par une entrée de progression. */
function unionFormationIds(grants: AnyDoc[], progressRows: AnyDoc[]): string[] {
  const ids = new Set<string>();
  for (const grant of grants) ids.add(String(grant.formationId));
  for (const row of progressRows) ids.add(String(row.formationId));
  return Array.from(ids);
}

/**
 * Documents accessibles pour une formation, selon la sémantique des grants
 * (miroir de `AccessService.canReadDocument`) :
 *  - `levelIds` vide     → tous les niveaux ;
 *  - `documentIds` vide  → tous les documents des niveaux autorisés ;
 *  - sinon               → uniquement les documents listés.
 * Sans grant (accès révoqué) : les seuls documents ayant une progression.
 */
function accessibleDocuments(
  documents: AnyDoc[],
  grant: AnyDoc | undefined,
  progressRows: AnyDoc[],
): AnyDoc[] {
  if (!grant) {
    const read = new Set(progressRows.map((row) => String(row.documentId)));
    return documents.filter((doc) => read.has(String(doc._id)));
  }
  const levelIds = ((grant.levelIds as string[] | undefined) ?? []).map(String);
  const documentIds = ((grant.documentIds as string[] | undefined) ?? []).map(String);
  return documents.filter((doc) => {
    const levelOk = levelIds.length === 0 || levelIds.includes(String(doc.levelId));
    if (!levelOk) return false;
    return documentIds.length === 0 || documentIds.includes(String(doc._id));
  });
}

/** Agrège l'avancement d'une formation (pages lues / complétés / activité). */
function buildFormationProgress(input: {
  formationId: string;
  formation?: AnyDoc;
  documents: AnyDoc[];
  grant?: AnyDoc;
  progressRows: AnyDoc[];
}): LearnerFormationProgress {
  const progressByDoc = new Map(
    input.progressRows.map((row) => [String(row.documentId), row]),
  );
  const docs = accessibleDocuments(input.documents, input.grant, input.progressRows);

  let pagesRead = 0;
  let totalPages = 0;
  let documentsStarted = 0;
  let documentsCompleted = 0;
  let lastActivityAt: number | null = null;

  for (const doc of docs) {
    const pageCount = Math.max(0, Number(doc.pageCount ?? 0));
    totalPages += pageCount;

    const row = progressByDoc.get(String(doc._id));
    if (!row) continue;

    const read = ((row.pagesRead as number[] | undefined) ?? []).length;
    // Borné par le pageCount catalogue : la valeur dénormalisée de la ligne
    // de progression peut avoir dérivé (document remplacé).
    pagesRead += Math.min(read, pageCount);
    if (read > 0) documentsStarted += 1;
    if (row.completed === true) documentsCompleted += 1;
    const updatedAt = Number(row.updatedAt ?? 0);
    if (updatedAt > 0 && (lastActivityAt === null || updatedAt > lastActivityAt)) {
      lastActivityAt = updatedAt;
    }
  }

  const formation = input.formation;
  return {
    formationId: input.formationId,
    formationName: String(formation?.name ?? input.formationId),
    icon: String(formation?.icon ?? '📘'),
    color: String(formation?.color ?? '#4F46E5'),
    documentsTotal: docs.length,
    documentsStarted,
    documentsCompleted,
    pagesRead,
    totalPages,
    percent: percentOf(pagesRead, totalPages),
    lastActivityAt,
  };
}

const percentOf = (pagesRead: number, totalPages: number): number =>
  totalPages > 0 ? Math.min(100, Math.round((pagesRead / totalPages) * 100)) : 0;
