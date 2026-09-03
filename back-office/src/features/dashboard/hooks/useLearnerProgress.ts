import { useInfiniteQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

/** Taille d'une fenêtre de formations (scroll infini de la modale). */
export const FORMATIONS_BATCH_SIZE = 6;

/**
 * Avancement d'un apprenant sélectionné, chargé par fenêtres successives
 * (load-more au scroll). `globalPercent` et `totalFormations` portent sur
 * toutes les formations : ils restent stables d'une page à l'autre.
 */
export function useLearnerProgress(userId: string | null) {
  const query = useInfiniteQuery({
    queryKey: ['learner-progress', userId],
    enabled: userId !== null,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      dashboardService.getLearnerProgress(userId!, {
        offset: pageParam,
        limit: FORMATIONS_BATCH_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.formations.length, 0);
      return loaded < lastPage.totalFormations ? loaded : undefined;
    },
  });

  const pages = query.data?.pages ?? [];
  const formations = pages.flatMap((page) => page.formations);
  // Compat backends antérieurs sans `totalFormations` : ils renvoient toute la
  // liste d'un coup → tout est déjà chargé (jamais de « 4 / 0 formations »).
  const totalFormations = Math.max(pages[0]?.totalFormations ?? 0, formations.length);
  const globalPercent = pages[0]?.globalPercent ?? 0;

  return {
    formations,
    totalFormations,
    globalPercent,
    hasMore: formations.length < totalFormations,
    isLoading: userId !== null && query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
  };
}
