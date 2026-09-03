import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { accessService } from '../services/accessService';

/**
 * Utilisateurs du select « Utilisateur », chargés côté serveur.
 *
 * - Au premier affichage : les 5 premiers utilisateurs (`limit=5`).
 * - À la saisie : recherche `/v1/admin/users?q=…`, toujours limitée à 5.
 */
export function useUserSearch() {
  const [search, setSearchState] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: ['user-search', debouncedSearch],
    queryFn: () => accessService.listUsers({ q: debouncedSearch || undefined, limit: 5 }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const isSearching =
    search.trim().length > 0 && (search.trim() !== debouncedSearch.trim() || query.isFetching);

  return {
    search,
    setSearch: (value: string) => setSearchState(value),
    users: query.data?.items ?? [],
    isSearching,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
