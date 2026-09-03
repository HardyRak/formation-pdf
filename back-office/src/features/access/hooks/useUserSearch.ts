import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { accessService } from '../services/accessService';

/**
 * Recherche d'utilisateurs côté serveur pour le select « Utilisateur ».
 *
 * - La saisie est debouncée avant d'atteindre `/v1/admin/users?q=…`.
 * - Sans terme, la requête est désactivée : la page affiche alors sa liste de
 *   base (déjà chargée pour résoudre les noms des attributions).
 */
export function useUserSearch() {
  const [search, setSearchState] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: ['user-search', debouncedSearch],
    queryFn: () => accessService.listUsers({ q: debouncedSearch }),
    enabled: debouncedSearch.trim().length > 0,
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
