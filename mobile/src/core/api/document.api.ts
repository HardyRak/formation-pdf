import type { PdfPage, TrainingDocument } from '../models';
import { httpClient } from './http-client';

export const documentApi = {
  listByLevel: (levelId: string) => httpClient.get<TrainingDocument[]>(`/levels/${levelId}/documents`),
  byId: (documentId: string) => httpClient.get<TrainingDocument>(`/documents/${documentId}`),
  /** Flux authentifié : le binaire ne transite jamais par une URL publique. */
  stream: (documentId: string) =>
    httpClient.get<{ documentId: string; pages: PdfPage[] }>(`/documents/${documentId}/stream`),
};
