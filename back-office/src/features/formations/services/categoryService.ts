import { api } from '@/shared/api/client';
import { withId, withIds, type RawDoc } from '@/shared/api/dto';
import type { CategoryDto } from '@/shared/types/api';

/** Communication avec le backend pour les catégories (/v1/admin/categories). */
export const categoryService = {
  list: async (): Promise<CategoryDto[]> =>
    withIds<CategoryDto>(await api.get<RawDoc[]>('/admin/categories')),

  /** Crée la catégorie (le serveur retourne 409 si elle existe déjà). */
  create: async (name: string): Promise<CategoryDto> =>
    withId<CategoryDto>(await api.post<RawDoc>('/admin/categories', { name })),
};
