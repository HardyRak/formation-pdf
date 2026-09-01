import type { DocumentProgress } from '../models';

/**
 * Fusion convergente de deux entrées de progression du MÊME document.
 * Utilisée par le mock backend (PUT /progression) et par le store mobile
 * lors du réalignement (GET /progression) — les deux côtés aboutissent au
 * même état, quel que soit l'ordre d'arrivée :
 *  - `pagesRead` : union des deux ensembles (aucune lecture perdue) ;
 *  - `lastPage` / `pageCount` / `levelId` / `formationId` : issus de
 *    l'entrée la plus récente (« last write wins » sur `updatedAt`) ;
 *  - `percent` / `completed` : recalculés depuis l'union.
 */
export function mergeProgressEntries(a: DocumentProgress, b: DocumentProgress): DocumentProgress {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const pagesRead = Array.from(new Set([...a.pagesRead, ...b.pagesRead])).sort((x, y) => x - y);
  const pageCount = Math.max(1, newer.pageCount);
  const readCount = pagesRead.length;

  return {
    documentId: newer.documentId,
    levelId: newer.levelId,
    formationId: newer.formationId,
    lastPage: Math.min(Math.max(newer.lastPage, 1), pageCount),
    pageCount,
    pagesRead,
    percent: percentOf(readCount, pageCount),
    completed: readCount >= pageCount,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

export const percentOf = (pagesRead: number, pageCount: number) =>
  pageCount > 0 ? Math.min(100, Math.round((pagesRead / pageCount) * 100)) : 0;
