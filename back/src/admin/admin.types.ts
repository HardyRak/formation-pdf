/**
 * Types partagés par le module d'administration (back-office).
 */

/** Document Mongoose « lean » : objet plat, toujours porteur de `_id`. */
export type AnyDoc = Record<string, unknown> & { _id: string };

/** Document admin : alias `id` attendu par le back-office (contrat DTO). */
export type AdminDoc = AnyDoc & { id: string };

/** Réponse générique d'une liste en pagination simple. */
export interface AdminList<T> {
  total: number;
  items: T[];
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
