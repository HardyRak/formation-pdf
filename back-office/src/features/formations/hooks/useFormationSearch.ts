import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formationService } from '../services/formationService';

/**
 * Formations du select « Formation », chargées côté serveur.
 *
 * - Au premier affichage : les 5 premières formations (`limit=5`).
 * - À la saisie : recherche `/v1/admin/formations?q=…`, toujours limitée à 5.
 */
export function useFormationSearch() {
  const [search, setSearchState] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: ['formation-search', debouncedSearch],
    queryFn: () => formationService.search(debouncedSearch, 5),
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
