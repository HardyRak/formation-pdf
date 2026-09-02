import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accessService } from '../services/accessService';

/** Lecture + mutations des attributions d'accès. */
export function useGrants() {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['grants'], queryFn: () => accessService.listGrants() });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['grants'] });
  };

  const grantMutation = useMutation({
    mutationFn: (body: { userId: string; formationId: string; levelIds: string[]; documentIds: string[] }) =>
      accessService.grant(body),
    onSuccess: invalidate,
  });
  const revokeGrantMutation = useMutation({
    mutationFn: (vars: { userId: string; formationId: string }) =>
      accessService.revokeGrant(vars.userId, vars.formationId),
    onSuccess: invalidate,
  });
  const revokeDocumentMutation = useMutation({
    mutationFn: (vars: { userId: string; documentId: string }) =>
      accessService.revokeDocument(vars.userId, vars.documentId),
    onSuccess: invalidate,
  });

  return {
    grants: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    grantMutation,
    revokeGrantMutation,
    revokeDocumentMutation,
  };
}
