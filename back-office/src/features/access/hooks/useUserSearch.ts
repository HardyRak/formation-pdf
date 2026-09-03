import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { accessService } from '../services/accessService';

/**
 * Apprenants du select « Utilisateur », chargés côté serveur.
 *
 * - On ne liste que `role=LEARNER` (on donne l'accès à un apprenant).
 * - Au premier affichage : les 5 premiers (`limit=5`).
 * - À la saisie : recherche `/v1/admin/users?q=…&role=LEARNER`, limitée à 5.
 */
export function useUserSearch() {
  const [search, setSearchState] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: ['user-search', debouncedSearch],
    queryFn: () =>
      accessService.listUsers({
        q: debouncedSearch || undefined,
        role: 'LEARNER',
        limit: 5,
      }),
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
