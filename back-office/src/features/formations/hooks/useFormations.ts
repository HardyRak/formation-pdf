import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormationDto } from '@/shared/types/api';
import { formationService } from '../services/formationService';

/** Lecture + mutations des formations, avec invalidation centralisée. */
export function useFormations() {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['formations'], queryFn: formationService.list });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['formations'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const createMutation = useMutation({ mutationFn: formationService.create, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; body: Partial<FormationDto> }) =>
      formationService.update(vars.id, vars.body),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: formationService.remove, onSuccess: invalidate });

  return {
    formations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
