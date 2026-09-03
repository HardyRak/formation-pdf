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

  /** Apprenants (role=LEARNER), paginés côté serveur + recherche `q`. */
  listLearners: (params: LearnersQuery) => {
    const qs = new URLSearchParams({
      role: 'LEARNER',
      page: String(params.page),
      limit: String(params.limit),
    });
    if (params.q) qs.set('q', params.q);
    return api.get<AdminList<UserDto>>(`/admin/users?${qs.toString()}`);
  },

  /** Avancement d'un apprenant, agrégé par formation (fenêtre offset/limit). */
  getLearnerProgress: (userId: string, params: { offset: number; limit: number }) => {
    const qs = new URLSearchParams({
      offset: String(params.offset),
      limit: String(params.limit),
    });
    return api.get<LearnerProgressDto>(
      `/admin/users/${encodeURIComponent(userId)}/progress?${qs.toString()}`,
    );
  },
};
