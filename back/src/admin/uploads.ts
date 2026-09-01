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

/** Vérifie si un chemin relatif reste dans le dossier d'upload (anti-traversal). */
export function resolveInUploadDir(relativePath: string): string {
  const dir = getUploadDir();
  const normalized = relativePath.replace(/^[/\\]+/, '');
  if (normalized.includes('..')) {
    throw new Error('Chemin fichier invalide.');
  }
  return `${dir.replace(/[/\\]+$/, '')}/${normalized}`;
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
