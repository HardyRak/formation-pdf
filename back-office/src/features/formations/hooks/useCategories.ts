import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';
import { toApiError } from '@/shared/api/client';

/**
 * Liste des catégories depuis le référentiel backend (`GET /admin/categories`).
 * - La liste se rafraîchit après chaque création de catégorie.
 * - `createCategory` insère immédiatement en BDD ; si elle existe déjà (409),
 *   on récupère/normalise simplement le nom sans bloquer (la création de la
 *   formation la réutilisera).
 */
export function useCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['categories'], queryFn: categoryService.list });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['categories'] });

  const createMutation = useMutation({
    mutationFn: async (name: string): Promise<string> => {
      try {
        const created = await categoryService.create(name);
        return created.name;
      } catch (error) {
        // Conflit « existe déjà » : on garde le nom saisi (insensible à la
        // casse côté serveur) sans faire échouer le formulaire.
        const apiErr = toApiError(error);
        if (apiErr.status === 409) return name.trim();
        throw apiErr;
      }
    },
    onSuccess: invalidate,
  });

  return {
    categories: query.data ?? [],
    categoryNames: (query.data ?? []).map((c) => c.name),
    isLoading: query.isLoading,
    isError: query.isError,
    createCategory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
