import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formationService } from '../services/formationService';

/**
 * Recherche de formations côté serveur pour le select « Formation ».
 *
 * - Saisie debouncée avant `/v1/admin/formations?q=…`.
 * - Sans terme, la requête est désactivée : la page affiche sa liste de base.
 */
export function useFormationSearch() {
  const [search, setSearchState] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: ['formation-search', debouncedSearch],
    queryFn: () => formationService.search(debouncedSearch),
    enabled: debouncedSearch.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const isSearching =
    search.trim().length > 0 && (search.trim() !== debouncedSearch.trim() || query.isFetching);

  return {
    search,
    setSearch: (value: string) => setSearchState(value),
    formations: query.data ?? [],
    isSearching,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
