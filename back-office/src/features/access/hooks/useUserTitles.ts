import { useQuery } from '@tanstack/react-query';
import { accessService } from '../services/accessService';

/**
 * Résout les libellés des utilisateurs référencés par les attributions.
 *
 * Un seul appel en lot (`GET /v1/admin/users?ids=…`) pour tous les
 * identifiants, au lieu de charger toute la base au montage de la page.
 */
export function useUserTitles(userIds: string[]): Record<string, string> {
  const ids = Array.from(new Set(userIds.filter(Boolean))).sort();

  const query = useQuery({
    queryKey: ['user-titles', ids],
    queryFn: () => accessService.listUsers({ ids: ids.join(',') }),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  const titles: Record<string, string> = {};
  for (const user of query.data?.items ?? []) {
    titles[user.id] = `${user.firstName} ${user.lastName}`;
  }
  return titles;
}
