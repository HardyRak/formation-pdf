import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';

/**
 * Liste des catégories depuis le référentiel backend (`GET /admin/categories`).
 * Le serveur crée automatiquement une catégorie inconnue à la sauvegarde d'une
 * formation ; on invalide cette clé après chaque mutation de formation pour
 * faire apparaître les nouvelles catégories.
 */
export function useCategories() {
  const query = useQuery({ queryKey: ['categories'], queryFn: categoryService.list });

  return {
    categories: query.data ?? [],
    categoryNames: (query.data ?? []).map((c) => c.name),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
