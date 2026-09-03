import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { useDebouncedValue } from './useDebouncedValue';

export const LEARNERS_PAGE_SIZE = 5;

/**
 * Liste paginée + recherche des apprenants (card du dashboard).
 *
 * - La saisie est debouncée avant d'atteindre l'API ;
 * - une nouvelle recherche ramène toujours à la page 1 ;
 * - `keepPreviousData` évite le flash de chargement entre les pages.
 */
export function useLearners() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  // Nouvelle recherche ⇒ reset de la page (dérivation d'état, pas de rendu intermédiaire).
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const query = useQuery({
    queryKey: ['learners', debouncedSearch, page],
    queryFn: () =>
      dashboardService.listLearners({
        q: debouncedSearch || undefined,
        page,
        limit: LEARNERS_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  return {
    search,
    setSearch,
    page,
    setPage,
    debouncedSearch,
    learners: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
