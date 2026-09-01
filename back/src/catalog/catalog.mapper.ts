import type { FormationDto, LevelDto, TrainingDocumentDto } from '../common/contracts';

type AnyDoc = Record<string, unknown> & { _id: string };

/** Mappe un document Mongoose (lean) vers le DTO attendu par le client. */
export function toFormationDto(doc: AnyDoc): FormationDto {
  return {
    id: doc._id,
    name: doc.name as string,
    description: doc.description as string,
    category: doc.category as string,
    icon: doc.icon as string,
    color: doc.color as string,
    levelsCount: (doc.levelsCount as number) ?? 0,
    documentsCount: (doc.documentsCount as number) ?? 0,
    totalPages: (doc.totalPages as number) ?? 0,
    durationMinutes: (doc.durationMinutes as number) ?? 0,
    mandatory: (doc.mandatory as boolean) ?? false,
  };
}

export function toLevelDto(doc: AnyDoc): LevelDto {
  return {
    id: doc._id,
    formationId: doc.formationId as string,
    order: (doc.order as number) ?? 0,
    name: doc.name as string,
    description: doc.description as string,
    documentsCount: (doc.documentsCount as number) ?? 0,
    totalPages: (doc.totalPages as number) ?? 0,
  };
}

export function toTrainingDocumentDto(doc: AnyDoc): TrainingDocumentDto {
  const updatedAt = doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? '');
  return {
    id: doc._id,
    levelId: doc.levelId as string,
    formationId: doc.formationId as string,
    order: (doc.order as number) ?? 0,
    title: doc.title as string,
    description: doc.description as string,
    pageCount: (doc.pageCount as number) ?? 0,
    sizeKb: (doc.sizeKb as number) ?? 0,
    updatedAt,
  };
}
