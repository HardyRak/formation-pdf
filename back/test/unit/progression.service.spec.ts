import { ProgressionService } from '../../src/progression/progression.service';

type Row = Record<string, unknown> & { _id: string };

/** Faux modèle Mongoose en mémoire pour `document_progress`. */
class FakeProgressModel {
  private rows = new Map<string, Row>();

  private query<T>(resolve: () => T | Promise<T>): any {
    const q: any = {
      lean: () => Promise.resolve(resolve()),
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    return q;
  }

  find(filter?: object) {
    const f = (filter ?? {}) as Record<string, unknown>;
    return this.query(() =>
      Array.from(this.rows.values()).filter((r) => r.userId === f.userId),
    );
  }

  findById(id: string) {
    return this.query(() => this.rows.get(id) ?? null);
  }

  async findOneAndUpdate(filter: object, update: object): Promise<Row> {
    const f = filter as Record<string, unknown>;
    const id = f._id as string;
    const existing = this.rows.get(id) ?? { _id: id };
    const set = (update as { $set?: Record<string, unknown> }).$set ?? {};
    const merged = { ...existing, ...set };
    this.rows.set(id, merged);
    return merged;
  }

  async deleteOne(filter: object) {
    const id = (filter as Record<string, unknown>)._id as string;
    return { deletedCount: this.rows.delete(id) ? 1 : 0 };
  }

  async deleteMany(filter: object) {
    const userId = (filter as Record<string, unknown>).userId as string;
    let count = 0;
    for (const key of Array.from(this.rows.keys())) {
      if (this.rows.get(key)?.userId === userId) {
        this.rows.delete(key);
        count += 1;
      }
    }
    return { deletedCount: count };
  }
}

const key = (userId: string, documentId: string) => `${userId}:${documentId}`;

describe('ProgressionService', () => {
  it('crée une entrée et recalcile percent/completed côté serveur', async () => {
    const model = new FakeProgressModel();
    const service = new ProgressionService(model as never);

    const dto = await service.upsert('usr-1', 'doc-hse-101', {
      levelId: 'l-hse-1',
      formationId: 'f-hse',
      lastPage: 2,
      pageCount: 4,
      pagesRead: [1, 2],
      percent: 0,
      completed: false,
      updatedAt: 100,
    });

    expect(dto.documentId).toBe('doc-hse-101');
    expect(dto.pagesRead).toEqual([1, 2]);
    expect(dto.percent).toBe(50);
    expect(dto.completed).toBe(false);
    // L'entrée a bien été persistée sous sa clé naturelle `userId:documentId`.
    expect((model as unknown as { rows: Map<string, Row> }).rows.has(key('usr-1', 'doc-hse-101'))).toBe(true);
  });

  it('fusionne les pages par union (offline-first, multi-appareils)', async () => {
    const model = new FakeProgressModel();
    const service = new ProgressionService(model as never);

    await service.upsert('usr-1', 'doc-hse-101', {
      levelId: 'l-hse-1',
      formationId: 'f-hse',
      lastPage: 3,
      pageCount: 5,
      pagesRead: [1, 2, 3],
      percent: 0,
      completed: false,
      updatedAt: 100,
    });
    const after = await service.upsert('usr-1', 'doc-hse-101', {
      levelId: 'l-hse-1',
      formationId: 'f-hse',
      lastPage: 5,
      pageCount: 5,
      pagesRead: [4, 5],
      percent: 0,
      completed: false,
      updatedAt: 200,
    });

    expect(after.pagesRead).toEqual([1, 2, 3, 4, 5]);
    expect(after.percent).toBe(100);
    expect(after.completed).toBe(true);
  });

  it('applique « last write wins » sur lastPage/pageCount', async () => {
    const model = new FakeProgressModel();
    const service = new ProgressionService(model as never);

    await service.upsert('usr-1', 'doc-hse-101', {
      levelId: 'l-hse-1',
      formationId: 'f-hse',
      lastPage: 3,
      pageCount: 10,
      pagesRead: [1, 2, 3],
      percent: 0,
      completed: false,
      updatedAt: 100,
    });
    const after = await service.upsert('usr-1', 'doc-hse-101', {
      levelId: 'l-hse-1',
      formationId: 'f-hse',
      lastPage: 7,
      pageCount: 20,
      pagesRead: [1, 2, 3, 7],
      percent: 0,
      completed: false,
      updatedAt: 500,
    });

    expect(after.lastPage).toBe(7);
    expect(after.pageCount).toBe(20);
    expect(after.percent).toBe(20);
  });

  it('nettoie et borne les pages hors de [1, pageCount]', async () => {
    const model = new FakeProgressModel();
    const service = new ProgressionService(model as never);

    const dto = await service.upsert('usr-1', 'doc-hse-101', {
      levelId: 'l-hse-1',
      formationId: 'f-hse',
      lastPage: 2,
      pageCount: 3,
      pagesRead: [0, 1, 2, 3, 4, 99],
      percent: 0,
      completed: false,
      updatedAt: 100,
    });

    expect(dto.pagesRead).toEqual([1, 2, 3]);
  });

  it('resetOne supprime une seule entrée et resetAll toutes celles du user', async () => {
    const model = new FakeProgressModel();
    const service = new ProgressionService(model as never);

    await service.upsert('usr-1', 'doc-hse-101', {
      levelId: 'l-hse-1',
      formationId: 'f-hse',
      lastPage: 1,
      pageCount: 2,
      pagesRead: [1],
      percent: 0,
      completed: false,
      updatedAt: 100,
    });
    await service.upsert('usr-1', 'doc-hse-102', {
      levelId: 'l-hse-2',
      formationId: 'f-hse',
      lastPage: 1,
      pageCount: 2,
      pagesRead: [1],
      percent: 0,
      completed: false,
      updatedAt: 100,
    });

    await expect(service.resetOne('usr-1', 'doc-hse-101')).resolves.toBe(true);
    const list = await service.listFor('usr-1');
    expect(list).toHaveLength(1);
    expect(list[0].documentId).toBe('doc-hse-102');

    const deleted = await service.resetAll('usr-1');
    expect(deleted).toBe(1);
    await expect(service.listFor('usr-1')).resolves.toEqual([]);
  });
});
