import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';
import { diskStorage } from 'multer';

/**
 * Stockage des fichiers PDF sur volume (`UPLOAD_DIR`, défaut « uploads/ »).
 *
 * - Le dossier est créé au démarrage (`ensureUploadDir`).
 * - Chaque fichier reçoit un nom aléatoire `<uuid>.pdf` (pas de collision, pas
 *   de traversée de répertoire) et n'est JAMAIS servi via une URL publique :
 *   il n'est lu que par l'endpoint authentifié `/documents/:id/stream`.
 * - Le chemin stocké sur le document (`filePath`) est RELATIF à `UPLOAD_DIR`
 *   (contrat du schéma `TrainingDocumentModel`) ; `resolveInUploadDir` est
 *   l'unique point de résolution lecture/suppression.
 */

/** Dossier de stockage résolu depuis l'environnement. */
export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? 'uploads';
}

/** Crée le dossier s'il n'existe pas, et le retourne. */
export function ensureUploadDir(): string {
  const dir = getUploadDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Résout un `filePath` stocké en chemin absolu dans `UPLOAD_DIR` (anti-traversal).
 *
 * Tolère les lignes historiques où le chemin Multer complet — préfixe
 * `UPLOAD_DIR` inclus (ex. « uploads/<uuid>.pdf ») — a été enregistré : le
 * préfixe est retiré avant résolution, ce qui répare ces lignes sans
 * migration de la base.
 */
export function resolveInUploadDir(storedPath: string): string {
  const dir = getUploadDir().replace(/[/\\]+$/, '');
  const normalizedDir = dir.replace(/\\/g, '/').replace(/^\/+/, '');
  let relative = storedPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (relative === normalizedDir || relative.startsWith(`${normalizedDir}/`)) {
    relative = relative.slice(normalizedDir.length).replace(/^\/+/, '');
  }
  if (!relative || relative.includes('..')) {
    throw new Error('Chemin fichier invalide.');
  }
  return `${dir}/${relative}`;
}

/** Storage Multer : écrit dans `UPLOAD_DIR` avec un nom aléatoire + extension `.pdf`. */
export const pdfMulterStorage = () =>
  diskStorage({
    destination: (_req, _file, cb) => {
      try {
        const dir = ensureUploadDir();
        cb(null, dir);
      } catch (error) {
        cb(error as Error, '');
      }
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext === '.pdf' ? ext : '.pdf'}`);
    },
  });
