import { catalogDb } from '../../core/api/backend/catalog';

/** Résolution du titre d'un document à partir de son identifiant. */
export function catalogTitleFor(documentId: string): string {
  const doc = catalogDb().documents.find((item) => item.id === documentId);
  return doc?.title ?? 'Document';
}
