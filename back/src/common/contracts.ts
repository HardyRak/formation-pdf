/** Contrats DTO partagés avec le client mobile (voir mobile/src/core/models). */

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'LEARNER' | 'MANAGER';
  company: string;
  avatarColor: string;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  /** Timestamp d'expiration du jeton d'accès, en millisecondes (compatibilité client). */
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
}

export type PdfBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'callout'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'divider' };

export interface PdfPageDto {
  documentId: string;
  number: number;
  blocks: PdfBlock[];
}

export interface StreamDto {
  documentId: string;
  pages: PdfPageDto[];
}

/** Progression de lecture d'un document (partagé mobile ⇄ backend). */
export interface DocumentProgressDto {
  documentId: string;
  levelId: string;
  formationId: string;
  lastPage: number;
  pageCount: number;
  pagesRead: number[];
  percent: number;
  completed: boolean;
  /** Horodatage (ms) de la dernière activité de lecture. */
  updatedAt: number;
}

/** Réponse du reset de progression (DELETE). */
export interface ProgressionResetResultDto {
  success: boolean;
  /** Nombre d'entrées supprimées (absent sur le reset d'un seul document). */
  deletedCount?: number;
}

/** Résumé des droits de l'utilisateur (équivalent serveur de access.ts côté mobile). */
export interface AccessSummaryDto {
  role: 'LEARNER' | 'MANAGER';
  /** Liste des formations accessibles. `['*']` = accès complet (manager). */
  formations: string[];
  /** Niveaux accessibles par formation. `[]` = tous les niveaux de la formation. */
  levels: Record<string, string[]>;
}

export interface ErrorBody {
  status: number;
  code: string;
  message: string;
}
