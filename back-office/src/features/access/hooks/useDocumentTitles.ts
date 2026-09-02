import { useQuery } from '@tanstack/react-query';
import { documentService } from '@/features/formations/services/documentService';

/**
 * Résout le titre des documents référencés par les attributions d'accès.
 *
 * Une seule requête en lot (`POST /admin/documents/titles`) pour tous les
 * identifiants, au lieu d'une requête par document. La clé de cache dépend de
 * la liste dédoublonnée et triée des identifiants.
 */
export function useDocumentTitles(documentIds: string[]): Record<string, string> {
  const ids = Array.from(new Set(documentIds.filter(Boolean))).sort();

  const query = useQuery({
    queryKey: ['document-titles', ids],
    queryFn: () => documentService.titles(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  return query.data ?? {};
}
