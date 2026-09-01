import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { DocumentProgressDto } from '../common/contracts';
import type { UpsertDocumentProgressDto } from './dto/upsert-document-progress.dto';
import { DocumentProgress, DocumentProgressDocument } from './document-progress.schema';

/** Document Mongoose « lean » (objet plat, même convention que catalog.mapper). */
type AnyDoc = Record<string, unknown> & { _id: string };

/**
 * Persistance de la progression de lecture en base MongoDB.
 *
 * Le mobile est offline-first : il pousse ses modifications ici et se
 * réaligne au démarrage. La stratégie de fusion est convergente :
 *  - `pagesRead` : union des pages (jamais de perte de lecture) ;
 *  - `lastPage` / `pageCount` : issus de l'entrée la plus récente
 *    (`updatedAt` le plus grand, « last write wins ») ;
 *  - `percent` / `completed` : recalculés côté serveur (source de vérité).
 *
 * Les entrées sont scellées à leur propriétaire (`userId` du JWT) : un
 * utilisateur ne peut jamais lire ni modifier la progression d'un autre.
 */
@Injectable()
export class ProgressionService {
  constructor(
    @InjectModel(DocumentProgress.name)
    private readonly progress: Model<DocumentProgressDocument>,
  ) {}

  async listFor(userId: string): Promise<DocumentProgressDto[]> {
    const items = await this.progress.find({ userId }).lean();
    return items.map((item) => this.toDto(item as unknown as AnyDoc));
  }

  async upsert(
    userId: string,
    documentId: string,
    incoming: UpsertDocumentProgressDto,
  ): Promise<DocumentProgressDto> {
    const pageCount = Math.max(1, Math.floor(incoming.pageCount));
    const pagesRead = sanitizePages(incoming.pagesRead, pageCount);
    const lastPage = clamp(incoming.lastPage, 1, pageCount);

    const existing = (await this.progress.findById(key(userId, documentId)).lean()) as
      | (AnyDoc & { userId: string; documentId: string })
      | null;

    // Fusion convergente : l'union des pages garantit qu'aucune lecture
    // n'est perdue, même en cas de collision multi-appareils.
    const existingPages = (existing?.pagesRead as number[] | undefined) ?? [];
    const mergedPages = Array.from(new Set([...existingPages, ...pagesRead])).sort(
      (a, b) => a - b,
    );

    const newer = !existing || incoming.updatedAt >= (existing.updatedAt as number);
    const finalPageCount = newer ? pageCount : (existing!.pageCount as number);
    const finalLastPage = newer ? lastPage : (existing!.lastPage as number);
    const updatedAt = Math.max(incoming.updatedAt, (existing?.updatedAt as number) ?? 0);

    const readCount = mergedPages.length;
    const percent = percentOf(readCount, finalPageCount);
    const completed = readCount >= finalPageCount;

    const saved = await this.progress.findOneAndUpdate(
      { _id: key(userId, documentId) },
      {
        $set: {
          userId,
          documentId,
          levelId: incoming.levelId,
          formationId: incoming.formationId,
          lastPage: clamp(finalLastPage, 1, finalPageCount),
          pageCount: finalPageCount,
          pagesRead: mergedPages,
          percent,
          completed,
          updatedAt,
        },
      },
      { upsert: true, new: true, lean: true },
    );

    return this.toDto(saved as unknown as AnyDoc);
  }

  async resetOne(userId: string, documentId: string): Promise<boolean> {
    const result = await this.progress.deleteOne({ _id: key(userId, documentId) });
    return (result.deletedCount ?? 0) > 0;
  }

  async resetAll(userId: string): Promise<number> {
    const result = await this.progress.deleteMany({ userId });
    return result.deletedCount ?? 0;
  }

  /** Mappe un document lean vers le DTO partagé avec le mobile. */
  private toDto(doc: AnyDoc): DocumentProgressDto {
    return {
      documentId: doc.documentId as string,
      levelId: doc.levelId as string,
      formationId: doc.formationId as string,
      lastPage: doc.lastPage as number,
      pageCount: doc.pageCount as number,
      pagesRead: (doc.pagesRead as number[] | undefined) ?? [],
      percent: doc.percent as number,
      completed: (doc.completed as boolean | undefined) ?? false,
      updatedAt: doc.updatedAt as number,
    };
  }
}

/** Clé naturelle `userId:documentId`, comme pour les access grants. */
const key = (userId: string, documentId: string) => `${userId}:${documentId}`;

const percentOf = (pagesRead: number, pageCount: number) =>
  pageCount > 0 ? Math.min(100, Math.round((pagesRead / pageCount) * 100)) : 0;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.floor(value)));

/** Déduplique, trie et borne les pages lues (1..pageCount). */
function sanitizePages(pages: number[], pageCount: number): number[] {
  return Array.from(
    new Set(
      pages
        .filter((p) => Number.isInteger(p) && p >= 1 && p <= pageCount)
        .map((p) => Math.floor(p)),
    ),
  ).sort((a, b) => a - b);
}
