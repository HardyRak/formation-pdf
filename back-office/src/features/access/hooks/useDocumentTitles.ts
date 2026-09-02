import { useQueries } from '@tanstack/react-query';
import { documentService } from '@/features/formations/services/documentService';

/**
 * Résout le titre des documents référencés par les attributions d'accès.
 *
 * Les grants ne portent que des `documentIds` ; pour afficher (et faire
 * confirmer) la révocation d'un document précis, on récupère son titre via
 * l'endpoint admin existant. Les IDs dédoublonnés sont chargés en parallèle
 * et mis en cache par TanStack Query.
 */
export function useDocumentTitles(documentIds: string[]): Record<string, string> {
  const ids = Array.from(new Set(documentIds.filter(Boolean)));

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['document', id],
      queryFn: () => documentService.get(id),
      staleTime: 60_000,
    })),
  });

  const titles: Record<string, string> = {};
  results.forEach((res, i) => {
    const id = ids[i];
    if (id && res.data) titles[id] = res.data.title;
  });
  return titles;
}
