import type { PdfPage, PdfStreamResult, TrainingDocument } from '../models';
import { httpClient } from './http-client';
import { bytesToUtf8 } from '../utils/binary';
import { API_MODE } from '../config/env';

/** Le type MIME des réponses JSON du backend. */
const JSON_MIME = /json/;

export const documentApi = {
  listByLevel: (levelId: string) => httpClient.get<TrainingDocument[]>(`/levels/${levelId}/documents`),
  byId: (documentId: string) => httpClient.get<TrainingDocument>(`/documents/${documentId}`),

  /**
   * Flux authentifié : le binaire ne transite jamais par une URL publique.
   * Retourne :
   *  - `{ kind: 'pdf', bytes }`  si le document est un vrai fichier PDF ;
   *  - `{ kind: 'blocks', pages }` sinon (contenu structuré, seed / mock).
   */
  stream: async (documentId: string): Promise<PdfStreamResult> => {
    // En mode mock, le backend simulé renvoie toujours des blocs (JSON).
    const result = await httpClient.getBinary(`/documents/${documentId}/stream`);

    if (API_MODE !== 'mock' && result.contentType && !JSON_MIME.test(result.contentType)) {
      return { kind: 'pdf', bytes: result.bytes, pageCount: 0 };
    }

    // Sinon on décode le JSON des blocs.
    const data = JSON.parse(bytesToUtf8(result.bytes)) as { documentId: string; pages: PdfPage[] };
    return { kind: 'blocks', pages: data.pages ?? [] };
  },
};
