import type { DocumentProgress, ProgressionResetResult } from '../models';
import { httpClient } from './http-client';

/**
 * Progression de lecture persistée en base MongoDB côté backend.
 * Le mobile reste offline-first : ces appels sont toujours « fire-and-
 * forget » depuis la file d'attente du store, jamais bloquants pour l'UI.
 */
export const progressionApi = {
  /** Toute la progression de l'utilisateur courant (réalignement au boot). */
  list: () => httpClient.get<DocumentProgress[]>('/progression'),

  /**
   * Upsert fusionné d'un document. Idempotent : rejouable sans risque
   * après une coupure réseau (l'union des pages est convergente).
   */
  upsert: (documentId: string, entry: DocumentProgress) =>
    httpClient.put<DocumentProgress>(`/progression/documents/${documentId}`, {
      levelId: entry.levelId,
      formationId: entry.formationId,
      lastPage: entry.lastPage,
      pageCount: entry.pageCount,
      pagesRead: entry.pagesRead,
      percent: entry.percent,
      completed: entry.completed,
      updatedAt: entry.updatedAt,
    }),

  /** Efface la progression d'un document (local + serveur). */
  resetDocument: (documentId: string) =>
    httpClient.delete<ProgressionResetResult>(`/progression/documents/${documentId}`),

  /** Efface toute la progression de l'utilisateur (local + serveur). */
  resetAll: () => httpClient.delete<ProgressionResetResult>('/progression'),
};
