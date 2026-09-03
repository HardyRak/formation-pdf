import { createHash } from 'crypto';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import type { PdfFileMeta } from './admin.types';
import { getUploadDir } from './uploads';

/**
 * Calcule les métadonnées d'un fichier PDF importé (empreinte SHA-256, taille,
 * nombre de pages) à partir du fichier déjà écrit sur le volume par Multer.
 *
 * Le nombre de pages est déduit via `pdf-lib` ; si le fichier n'est pas un PDF
 * lisible, `pageCount` vaut 0 (le document est enregistré mais le contenu est
 * alors servi en blocs structurés, cf. `/documents/:id/stream`).
 */
export async function computePdfFileMeta(
  file: Express.Multer.File | undefined,
): Promise<PdfFileMeta> {
  const empty: PdfFileMeta = {
    filePath: '',
    originalFilename: '',
    mimeType: 'application/pdf',
    sha256: '',
    pageCount: 0,
    sizeKb: 0,
  };
  if (!file) return empty;

  const bytes = existsSync(file.path)
    ? new Uint8Array(readFileSync(file.path))
    : new Uint8Array();
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const sizeKb = Math.max(1, Math.round((file.size ?? bytes.byteLength) / 1024));
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return {
      filePath: file.path,
      originalFilename: file.originalname,
      mimeType: file.mimetype || 'application/pdf',
      sha256,
      pageCount: pdf.getPageCount(),
      sizeKb,
    };
  } catch {
    // Fichier non-PDF ou corrompu : métadonnées conservées, pageCount = 0.
    return {
      filePath: file.path,
      originalFilename: file.originalname,
      mimeType: file.mimetype || 'application/pdf',
      sha256,
      pageCount: 0,
      sizeKb,
    };
  }
}

/**
 * Supprime un fichier PDF du volume (best effort). `relativePath` est le chemin
 * relatif stocké sur le document ; on s'assure qu'il reste dans `UPLOAD_DIR`.
 */
export function removePdfFile(relativePath: string): void {
  try {
    const dir = getUploadDir();
    const absolute = `${dir.replace(/[/\\]+$/, '')}/${relativePath.replace(/[/\\]+$/, '')}`;
    if (existsSync(absolute)) unlinkSync(absolute);
  } catch {
    // best effort
  }
}
