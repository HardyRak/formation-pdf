/**
 * Types partagés avec le backend NestJS (`back/src/common/contracts.ts`
 * et `back/src/admin/dto.ts`).
 */

export type Role = 'LEARNER' | 'MANAGER';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  company: string;
  avatarColor: string;
  active?: boolean;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: UserDto;
}

export interface FormationDto {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  levelsCount: number;
  documentsCount: number;
  totalPages: number;
  durationMinutes: number;
  mandatory: boolean;
}

export interface CategoryDto {
  id: string;
  name: string;
  order: number;
}

export interface LevelDto {
  id: string;
  formationId: string;
  order: number;
  name: string;
  description: string;
  documentsCount: number;
  totalPages: number;
}

export interface TrainingDocumentDto {
  id: string;
  levelId: string;
  formationId: string;
  order: number;
  title: string;
  description: string;
  pageCount: number;
  sizeKb: number;
  updatedAt: string;
  filePath?: string;
  originalFilename?: string;
}

export interface AccessGrantDto {
  _id: string;
  userId: string;
  formationId: string;
  levelIds: string[];
  documentIds: string[];
}

export interface AdminList<T> {
  total: number;
  items: T[];
  /** Renseignés uniquement quand la requête est paginée (page/limit). */
  page?: number;
  limit?: number;
  totalPages?: number;
}

/** Avancement d'un apprenant sur une formation (agrégé côté backend). */
export interface LearnerFormationProgressDto {
  formationId: string;
  formationName: string;
  icon: string;
  color: string;
  documentsTotal: number;
  documentsStarted: number;
  documentsCompleted: number;
  pagesRead: number;
  totalPages: number;
  percent: number;
  /** Dernière activité de lecture (ms) ; null si aucune lecture. */
  lastActivityAt: number | null;
}

/** Réponse de GET /admin/users/:id/progress. */
export interface LearnerProgressDto {
  user: UserDto;
  formations: LearnerFormationProgressDto[];
  globalPercent: number;
}

export interface StatsDto {
  users: number;
  managers: number;
  learners: number;
  formations: number;
  levels: number;
  documents: number;
  grants: number;
  perFormation: { formationId: string; documents: number }[];
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
}
