import { api } from '@/shared/api/client';
import { withIds, type RawDoc } from '@/shared/api/dto';
import type { FormationDto } from '@/shared/types/api';

/** Communication avec le backend pour les formations (/v1/admin/formations). */
export const formationService = {
  list: async (): Promise<FormationDto[]> =>
    withIds<FormationDto>(await api.get<RawDoc[]>('/admin/formations')),

  search: async (q: string): Promise<FormationDto[]> =>
    withIds<FormationDto>(await api.get<RawDoc[]>(`/admin/formations?q=${encodeURIComponent(q)}`)),

  listByIds: async (ids: string[]): Promise<FormationDto[]> =>
    withIds<FormationDto>(
      await api.get<RawDoc[]>(`/admin/formations?ids=${encodeURIComponent(ids.join(','))}`),
    ),

  create: (body: Partial<FormationDto>) => api.post<FormationDto>('/admin/formations', body),

  update: (id: string, body: Partial<FormationDto>) =>
    api.patch<FormationDto>(`/admin/formations/${id}`, body),

  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/formations/${id}`),
};
