/**
 * Mappage DTO API → modèle applicatif (convention : ne pas coupler l'UI au
 * format brut du backend). Backend ancien : docs lean avec `_id` sans `id`.
 */
export type RawDoc = Record<string, unknown> & { id?: string; _id?: string };

export function withId<T>(raw: RawDoc): T {
  return { ...raw, id: raw.id ?? raw._id ?? '' } as T;
}

export const withIds = <T>(rows: RawDoc[]): T[] => rows.map((r) => withId<T>(r));
