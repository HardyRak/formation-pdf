import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { pdfMulterStorage, resolveInUploadDir } from '../../src/common/uploads';
import { removePdfFile } from '../../src/admin/pdf.util';

/**
 * Régression : le chemin stocké sur un document (`filePath`) doit être RELATIF
 * à `UPLOAD_DIR`. Stocker le chemin Multer complet (`file.path`, préfixe inclus)
 * faisait résoudre `uploads/uploads/<uuid>.pdf` côté `/documents/:id/stream`
 * (download corrompu) et empêchait la suppression du fichier sur le volume.
 */
describe('common/uploads — résolution des chemins PDF', () => {
  const previous = process.env.UPLOAD_DIR;
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'pdf-upload-'));
    process.env.UPLOAD_DIR = dir;
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previous;
  });

  it('résout un chemin relatif (contrat du schéma)', () => {
    expect(resolveInUploadDir('abc-123.pdf')).toBe(`${dir}/abc-123.pdf`);
  });

  it('tolère un chemin historique préfixé par UPLOAD_DIR (relatif)', () => {
    process.env.UPLOAD_DIR = 'uploads';
    try {
      expect(resolveInUploadDir('uploads/abc-123.pdf')).toBe('uploads/abc-123.pdf');
    } finally {
      process.env.UPLOAD_DIR = dir;
    }
  });

  it('tolère un chemin historique préfixé par UPLOAD_DIR (absolu)', () => {
    const stored = `${dir}/abc-123.pdf`;
    expect(resolveInUploadDir(stored)).toBe(stored);
  });

  it('rejette la traversée de répertoire', () => {
    expect(() => resolveInUploadDir('../etc/passwd')).toThrow('Chemin fichier invalide.');
    expect(() => resolveInUploadDir('a/../../etc/passwd')).toThrow('Chemin fichier invalide.');
    expect(() => resolveInUploadDir('')).toThrow('Chemin fichier invalide.');
  });

  it('Multer : file.filename (stocké) et file.path (écrit) résolvent au même fichier', (done) => {
    const storage = pdfMulterStorage();
    const content = Buffer.from('%PDF-1.4\n%test\n');
    const file = {
      fieldname: 'file',
      originalname: 'Guide de Demarrage.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: content.byteLength,
      stream: Readable.from(content),
    } as Express.Multer.File;

    storage._handleFile({} as never, file, (error, info) => {
      try {
        expect(error).toBeNull();
        expect(info?.filename).toMatch(/^[\w-]+\.pdf$/);
        // Comportement Multer : `path` contient le préfixe destination…
        expect(info?.path).toBe(`${dir}/${info?.filename}`);
        expect(existsSync(info?.path as string)).toBe(true);
        // …le contrat stocké (`filename`) se résout donc vers le fichier écrit…
        expect(resolveInUploadDir(info?.filename as string)).toBe(info?.path);
        // …et la tolérance historique répare un éventuel `filePath = file.path`.
        expect(resolveInUploadDir(info?.path as string)).toBe(info?.path);
        done();
      } catch (failure) {
        done(failure as Error);
      }
    });
  });

  it('removePdfFile supprime le fichier pour les deux formats stockés', () => {
    writeFileSync(`${dir}/legacy.pdf`, '%PDF-1.4');
    writeFileSync(`${dir}/contract.pdf`, '%PDF-1.4');

    removePdfFile(`${dir}/legacy.pdf`); // format historique : chemin Multer complet
    removePdfFile('contract.pdf'); // format contrat (relatif)

    expect(existsSync(`${dir}/legacy.pdf`)).toBe(false);
    expect(existsSync(`${dir}/contract.pdf`)).toBe(false);
  });
});
