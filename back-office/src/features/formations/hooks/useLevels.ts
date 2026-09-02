import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LevelDto } from '@/shared/types/api';
import { levelService } from '../services/levelService';

/** Lecture + mutations des niveaux d'une formation. */
export function useLevels(formationId: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['levels', formationId],
    queryFn: () => levelService.list(formationId),
    enabled,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['levels', formationId] });
    void queryClient.invalidateQueries({ queryKey: ['formations'] });
  };

  const createMutation = useMutation({
    mutationFn: (body: Partial<LevelDto>) => levelService.create(formationId, body),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; body: Partial<LevelDto> }) => levelService.update(vars.id, vars.body),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: levelService.remove, onSuccess: invalidate });

  return {
    levels: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
