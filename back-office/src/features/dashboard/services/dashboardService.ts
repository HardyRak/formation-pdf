import { api } from '@/shared/api/client';
import type { StatsDto } from '@/shared/types/api';

/** Communication avec le backend pour les statistiques (/v1/admin/stats). */
export const dashboardService = {
  getStats: () => api.get<StatsDto>('/admin/stats'),
};
