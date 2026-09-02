/**
 * Appels API du module admin (routes /v1/admin/*).
 * Toutes ces routes sont réservées au rôle MANAGER (garde serveur).
 */
import { api } from './client';
import type {
  AccessGrantDto,
  AdminList,
  FormationDto,
  LevelDto,
  StatsDto,
  TrainingDocumentDto,
  UserDto,
} from './types';

/**
 * Backend ancien (pré-fix) : les documents lean arrivaient avec `_id` mais
 * sans `id`. Normalisation côté client pour que le back-office reste
 * fonctionnel quel que soit l'état du backend déployé.
 */
type RawDoc = Record<string, unknown> & { id?: string; _id?: string };

function withId<T>(raw: RawDoc): T {
  return { ...raw, id: raw.id ?? raw._id ?? '' } as T;
}

const withIds = <T>(rows: RawDoc[]): T[] => rows.map((r) => withId<T>(r));

// ---- Statistiques -------------------------------------------------------

export const getStats = () => api.get<StatsDto>('/admin/stats');

// ---- Utilisateurs -------------------------------------------------------

export const listUsers = (params: { q?: string; role?: string }) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.role) qs.set('role', params.role);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<AdminList<UserDto>>(`/admin/users${suffix}`);
};

export const createUser = (body: Partial<UserDto> & { password: string }) =>
  api.post<UserDto>('/admin/users', body);

export const updateUser = (id: string, body: Partial<UserDto> & { password?: string }) =>
  api.patch<UserDto>(`/admin/users/${id}`, body);

export const setUserActive = (id: string, active: boolean) =>
  api.post<UserDto>(`/admin/users/${id}/active`, { active });

// ---- Accès --------------------------------------------------------------

export const listGrants = (userId?: string) =>
  api.get<AccessGrantDto[]>(`/admin/access${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);

export const grantAccess = (body: {
  userId: string;
  formationId: string;
  levelIds?: string[];
  documentIds?: string[];
}) => api.post<AccessGrantDto>('/admin/access', body);

export const revokeGrant = (userId: string, formationId: string) =>
  api.delete<{ success: boolean }>(`/admin/access/${userId}/${formationId}`);

export const revokeDocument = (userId: string, documentId: string) =>
  api.delete<{ success: boolean }>(`/admin/access/document/${userId}/${documentId}`);

// ---- Formations ---------------------------------------------------------

export const listFormations = async (): Promise<FormationDto[]> =>
  withIds<FormationDto>(await api.get<RawDoc[]>('/admin/formations'));

export const createFormation = (body: Partial<FormationDto>) =>
  api.post<FormationDto>('/admin/formations', body);

export const updateFormation = (id: string, body: Partial<FormationDto>) =>
  api.patch<FormationDto>(`/admin/formations/${id}`, body);

export const deleteFormation = (id: string) =>
  api.delete<{ success: boolean }>(`/admin/formations/${id}`);

// ---- Niveaux ------------------------------------------------------------

export const listLevels = async (formationId: string): Promise<LevelDto[]> =>
  withIds<LevelDto>(await api.get<RawDoc[]>(`/admin/formations/${formationId}/levels`));

export const createLevel = (formationId: string, body: Partial<LevelDto>) =>
  api.post<LevelDto>(`/admin/formations/${formationId}/levels`, body);

export const updateLevel = (id: string, body: Partial<LevelDto>) =>
  api.patch<LevelDto>(`/admin/levels/${id}`, body);

export const deleteLevel = (id: string) =>
  api.delete<{ success: boolean }>(`/admin/levels/${id}`);

// ---- Documents + PDF ----------------------------------------------------

export const listDocuments = async (levelId: string): Promise<TrainingDocumentDto[]> =>
  withIds<TrainingDocumentDto>(await api.get<RawDoc[]>(`/admin/levels/${levelId}/documents`));

export const getDocument = async (id: string): Promise<TrainingDocumentDto> =>
  withId<TrainingDocumentDto>(await api.get<RawDoc>(`/admin/documents/${id}`));

export const createDocument = (levelId: string, body: { title: string; description?: string }, file: File) => {
  const form = new FormData();
  form.append('file', file);
  form.append('title', body.title);
  if (body.description) form.append('description', body.description);
  return api.postForm<TrainingDocumentDto>(`/admin/levels/${levelId}/documents`, form);
};

export const replaceDocumentFile = (id: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.putForm<TrainingDocumentDto>(`/admin/documents/${id}/content`, form);
};

export const updateDocument = (id: string, body: Partial<TrainingDocumentDto>) =>
  api.patch<TrainingDocumentDto>(`/admin/documents/${id}`, body);

export const deleteDocument = (id: string) =>
  api.delete<{ success: boolean }>(`/admin/documents/${id}`);

// ---- Téléchargement (stream authentifié) --------------------------------

export const streamDocument = (id: string) => api.blob(`/documents/${id}/stream`);
