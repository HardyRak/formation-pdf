/**
 * Types partagés par le module d'administration (back-office).
 */
import type { UserDto } from '../common/contracts';

/** Document Mongoose « lean » : objet plat, toujours porteur de `_id`. */
export type AnyDoc = Record<string, unknown> & { _id: string };

/** Document admin : alias `id` attendu par le back-office (contrat DTO). */
export type AdminDoc = AnyDoc & { id: string };

/**
 * Réponse générique d'une liste.
 * `page` / `limit` / `totalPages` ne sont renseignés QUE lorsque la requête
 * est paginée (sinon comportement historique : toute la collection).
 */
export interface AdminList<T> {
  total: number;
  items: T[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

/** Avancement d'un apprenant sur UNE formation (agrégation back-office). */
export interface LearnerFormationProgress {
  formationId: string;
  formationName: string;
  icon: string;
  color: string;
  /** Documents accessibles dans la formation (règles des grants). */
  documentsTotal: number;
  /** Documents ayant au moins une page lue. */
  documentsStarted: number;
  /** Documents terminés (`completed` recalculé côté serveur). */
  documentsCompleted: number;
  /** Total des pages lues sur les documents accessibles. */
  pagesRead: number;
  /** Total des pages des documents accessibles. */
  totalPages: number;
  /** Progression de la formation, en pourcentage de pages lues (0–100). */
  percent: number;
  /** Dernière activité de lecture (ms) ; `null` si aucune lecture. */
  lastActivityAt: number | null;
}

/** Réponse de `GET /v1/admin/users/:id/progress`. */
export interface LearnerProgressDto {
  user: UserDto;
  /**
   * Fenêtre de formations (ordre alphabétique stable) lorsque la requête est
   * paginée via `offset`/`limit` ; toutes sinon.
   */
  formations: LearnerFormationProgress[];
  /** Nombre TOTAL de formations avant pagination (pour le load-more client). */
  totalFormations: number;
  /** Progression globale, pondérée par les pages de TOUTES les formations. */
  globalPercent: number;
}

/** Métadonnées extraites d'un fichier PDF importé sur le volume. */
export interface PdfFileMeta {
  filePath: string;
  originalFilename: string;
  mimeType: string;
  sha256: string;
  pageCount: number;
  sizeKb: number;
}

/** Les documents Mongoose lean portent `_id` ; le back-office lit `id`. */
export function withId(doc: AnyDoc): AdminDoc {
  return { ...doc, id: doc._id };
}
