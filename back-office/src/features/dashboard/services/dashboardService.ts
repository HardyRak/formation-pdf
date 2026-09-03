import { api } from '@/shared/api/client';
import type { AdminList, LearnerProgressDto, StatsDto, UserDto } from '@/shared/types/api';

/** Paramètres de listage paginé des apprenants (dashboard). */
export interface LearnersQuery {
  q?: string;
  page: number;
  limit: number;
}

/** Communication avec le backend pour les statistiques (/v1/admin). */
export const dashboardService = {
  getStats: () => api.get<StatsDto>('/admin/stats'),

  /** Apprenants, paginés côté serveur (role=LEARNER + recherche `q`). */
  listLearners: (params: LearnersQuery) => {
    const qs = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.q) qs.set('q', params.q);
    return api.get<AdminList<UserDto>>(`/admin/users?${qs.toString()}`);
  },

  /** Avancement d'un apprenant, agrégé par formation. */
  getLearnerProgress: (userId: string) =>
    api.get<LearnerProgressDto>(`/admin/users/${encodeURIComponent(userId)}/progress`),
};
