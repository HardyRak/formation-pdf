import { api } from '@/shared/api/client';
import { withId, withIds, type RawDoc } from '@/shared/api/dto';
import type { TrainingDocumentDto } from '@/shared/types/api';

/** Communication avec le backend pour les documents PDF (/v1/admin). */
export const documentService = {
  list: async (levelId: string): Promise<TrainingDocumentDto[]> =>
    withIds<TrainingDocumentDto>(await api.get<RawDoc[]>(`/admin/levels/${levelId}/documents`)),

  get: async (id: string): Promise<TrainingDocumentDto> =>
    withId<TrainingDocumentDto>(await api.get<RawDoc>(`/admin/documents/${id}`)),

  create: (levelId: string, body: { title: string; description?: string }, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', body.title);
    if (body.description) form.append('description', body.description);
    return api.postForm<TrainingDocumentDto>(`/admin/levels/${levelId}/documents`, form);
  },

  replaceFile: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.putForm<TrainingDocumentDto>(`/admin/documents/${id}/content`, form);
  },

  update: (id: string, body: Partial<TrainingDocumentDto>) =>
    api.patch<TrainingDocumentDto>(`/admin/documents/${id}`, body),

  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/documents/${id}`),

  /** Stream authentifié (binaire PDF). */
  stream: (id: string) => api.blob(`/documents/${id}/stream`),

  /** Télécharge le PDF via un Blob (jamais d'URL publique). */
  download: async (id: string, title: string): Promise<void> => {
    const blob = await documentService.stream(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
