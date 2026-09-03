import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

/**
 * Avancement d'un apprenant sélectionné.
 * Requête activée seulement quand un apprenant est choisi (modale ouverte).
 */
export function useLearnerProgress(userId: string | null) {
  const query = useQuery({
    queryKey: ['learner-progress', userId],
    queryFn: () => dashboardService.getLearnerProgress(userId!),
    enabled: userId !== null,
  });

  return {
    progress: query.data,
    isLoading: userId !== null && query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
