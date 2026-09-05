import type { FormationCategory, FormationPage, Level } from '../models';
import { httpClient } from './http-client';

/** Paramètres de la liste paginée du catalogue (recherche + filtre serveur). */
export interface ListFormationsParams {
  page: number;
  limit: number;
  q?: string;
  category?: string;
}

function toQueryString(params: ListFormationsParams): string {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const q = params.q?.trim();
  if (q) search.set('q', q);
  if (params.category) search.set('category', params.category);
  return search.toString();
}

export const formationApi = {
  list: (params: ListFormationsParams) =>
    httpClient.get<FormationPage>(`/formations?${toQueryString(params)}`),
  categories: () => httpClient.get<FormationCategory[]>('/formations/categories'),
  levels: (formationId: string) => httpClient.get<Level[]>(`/formations/${formationId}/levels`),
};
