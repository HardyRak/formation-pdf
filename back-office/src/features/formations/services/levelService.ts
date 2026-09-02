import { api } from '@/shared/api/client';
import { withIds, type RawDoc } from '@/shared/api/dto';
import type { LevelDto } from '@/shared/types/api';

/** Communication avec le backend pour les niveaux (/v1/admin). */
export const levelService = {
  list: async (formationId: string): Promise<LevelDto[]> =>
    withIds<LevelDto>(await api.get<RawDoc[]>(`/admin/formations/${formationId}/levels`)),

  create: (formationId: string, body: Partial<LevelDto>) =>
    api.post<LevelDto>(`/admin/formations/${formationId}/levels`, body),

  update: (id: string, body: Partial<LevelDto>) => api.patch<LevelDto>(`/admin/levels/${id}`, body),

  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/levels/${id}`),
};
