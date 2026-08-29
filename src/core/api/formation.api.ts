import type { Formation, Level } from '../models';
import { httpClient } from './http-client';

export const formationApi = {
  list: () => httpClient.get<Formation[]>('/formations'),
  levels: (formationId: string) => httpClient.get<Level[]>(`/formations/${formationId}/levels`),
};
