import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documentService';

/** Lecture + mutations des documents PDF d'un niveau. */
export function useDocuments(levelId: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['documents', levelId],
    queryFn: () => documentService.list(levelId),
    enabled,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['documents', levelId] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (vars: { title: string; description: string; file: File }) =>
      documentService.create(levelId, { title: vars.title, description: vars.description }, vars.file),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: documentService.remove, onSuccess: invalidate });
  const replaceMutation = useMutation({
    mutationFn: (vars: { id: string; file: File }) => documentService.replaceFile(vars.id, vars.file),
    onSuccess: invalidate,
  });

  return {
    documents: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    uploadMutation,
    deleteMutation,
    replaceMutation,
  };
}
