/**
 * Modèles de domaine partagés avec le backend NestJS.
 * (Contrats DTO – aucune logique ici.)
 */

import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'LEARNER' | 'MANAGER';
  company: string;
  avatarColor: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface Formation {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: IconName;
  color: string;
  levelsCount: number;
  documentsCount: number;
  totalPages: number;
  durationMinutes: number;
  mandatory: boolean;
}

export interface Level {
  id: string;
  formationId: string;
  order: number;
  name: string;
  description: string;
  documentsCount: number;
  totalPages: number;
}

export interface TrainingDocument {
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

/** Une page rendue, streamée depuis le backend (jamais d'URL publique). */
export interface PdfPage {
  documentId: string;
  number: number;
  blocks: PdfBlock[];
}

export interface DocumentProgress {
  documentId: string;
  levelId: string;
  formationId: string;
  lastPage: number;
  pageCount: number;
  pagesRead: number[];
  percent: number;
  completed: boolean;
  updatedAt: number;
}

export interface ProgressionSnapshot {
  documents: Record<string, DocumentProgress>;
  currentDocumentId: string | null;
  updatedAt: number;
}

/** Résumé des droits d'accès (GET /auth/me/access). */
export interface AccessSummary {
  role: 'LEARNER' | 'MANAGER';
  /** `['*']` = accès complet (manager). */
  formations: string[];
  /** Niveaux accessibles par formation (`[]` = tous les niveaux de la formation). */
  levels: Record<string, string[]>;
}

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  status: number;
  code: string;
  message: string;
}
