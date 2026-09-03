import { useQuery } from '@tanstack/react-query';
import { formationService } from '../services/formationService';

/**
 * Résout les noms des formations référencées par les attributions.
 *
 * Un seul appel en lot (`GET /v1/admin/formations?ids=…`) pour tous les
 * identifiants, au lieu de charger toute la liste au montage de la page.
 */
export function useFormationTitles(formationIds: string[]): Record<string, string> {
  const ids = Array.from(new Set(formationIds.filter(Boolean))).sort();

  const query = useQuery({
    queryKey: ['formation-titles', ids],
    queryFn: () => formationService.listByIds(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  const titles: Record<string, string> = {};
  for (const formation of query.data ?? []) {
    titles[formation.id] = formation.name;
  }
  return titles;
}
