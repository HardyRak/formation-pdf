import { HttpException } from '@nestjs/common';
import { AdminProgressService } from '../../src/admin/admin-progress.service';

type Row = Record<string, unknown> & { _id: string };

/**
 * Faux modèle Mongoose en mémoire : `findById().lean()` et
 * `find({ champ: { $in: [...] } }).lean()` — le strict nécessaire pour
 * `AdminProgressService`.
 */
class FakeModel {
  constructor(private readonly rows: Row[]) {}

  findById(id: string): { lean: () => Promise<Row | null> } {
    return { lean: () => Promise.resolve(this.rows.find((r) => r._id === id) ?? null) };
  }

  find(filter: Record<string, unknown> = {}): { lean: () => Promise<Row[]> } {
    const entries = Object.entries(filter);
    return {
      lean: () =>
        Promise.resolve(
          this.rows.filter((row) =>
            entries.every(([field, value]) => {
              if (
                typeof value === 'object' &&
                value !== null &&
                Array.isArray((value as { $in?: unknown[] }).$in)
              ) {
                return ((value as { $in: unknown[] }).$in).includes(row[field]);
              }
              return row[field] === value;
            }),
          ),
        ),
    };
  }
}

/** Fake du service d'accès : liste de grants plate (comme `listGrants`). */
class FakeAccessService {
  constructor(private readonly grants: Row[]) {}

  async listGrants(userId?: string): Promise<Row[]> {
    return this.grants.filter((g) => !userId || g.userId === userId);
  }
}

function makeService(data: {
  users?: Row[];
  formations?: Row[];
  documents?: Row[];
  progress?: Row[];
  grants?: Row[];
}): AdminProgressService {
  return new AdminProgressService(
    new FakeModel(data.users ?? []) as never,
    new FakeModel(data.formations ?? []) as never,
    new FakeModel(data.documents ?? []) as never,
    new FakeModel(data.progress ?? []) as never,
    new FakeAccessService(data.grants ?? []) as never,
  );
}

const USER: Row = {
  _id: 'usr-1',
  email: 'sophie@pdftrain.io',
  firstName: 'Sophie',
  lastName: 'Martin',
  role: 'LEARNER',
};

describe('AdminProgressService.learnerProgress', () => {
  it('refuse un utilisateur inconnu (404 NOT_FOUND)', async () => {
    const service = makeService({});
    const error = await service.learnerProgress('usr-x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(404);
    expect((error as HttpException).getResponse()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('renvoie une liste vide quand aucun grant ni aucune lecture', async () => {
    const service = makeService({ users: [USER] });
    const dto = await service.learnerProgress('usr-1');

    expect(dto.user.id).toBe('usr-1');
    expect(dto.formations).toEqual([]);
    expect(dto.totalFormations).toBe(0);
    expect(dto.globalPercent).toBe(0);
  });

  it('agrège pages lues, complétés et dernière activité par formation', async () => {
    const service = makeService({
      users: [USER],
      formations: [{ _id: 'f-hse', name: 'Sécurité HSE', icon: '🦺', color: '#F59E0B' }],
      documents: [
        { _id: 'doc-1', formationId: 'f-hse', levelId: 'l-1', pageCount: 10 },
        { _id: 'doc-2', formationId: 'f-hse', levelId: 'l-1', pageCount: 30 },
      ],
      grants: [{ _id: 'usr-1:f-hse', userId: 'usr-1', formationId: 'f-hse', levelIds: [], documentIds: [] }],
      progress: [
        { _id: 'usr-1:doc-1', userId: 'usr-1', documentId: 'doc-1', formationId: 'f-hse', pagesRead: [1, 2, 3, 4, 5], pageCount: 10, completed: false, updatedAt: 200 },
        { _id: 'usr-1:doc-2', userId: 'usr-1', documentId: 'doc-2', formationId: 'f-hse', pagesRead: Array.from({ length: 30 }, (_, i) => i + 1), pageCount: 30, completed: true, updatedAt: 500 },
      ],
    });

    const dto = await service.learnerProgress('usr-1');
    expect(dto.formations).toHaveLength(1);
    expect(dto.totalFormations).toBe(1);

    const f = dto.formations[0];
    expect(f.formationName).toBe('Sécurité HSE');
    expect(f.documentsTotal).toBe(2);
    expect(f.documentsStarted).toBe(2);
    expect(f.documentsCompleted).toBe(1);
    expect(f.pagesRead).toBe(35);
    expect(f.totalPages).toBe(40);
    expect(f.percent).toBe(88); // 35 / 40
    expect(f.lastActivityAt).toBe(500);
    expect(dto.globalPercent).toBe(88);
  });

  it('ne compte que les documents couverts par le grant (niveau restreint)', async () => {
    const service = makeService({
      users: [USER],
      formations: [
        { _id: 'f-cyber', name: 'Cybersécurité', icon: '🛡️', color: '#0EA5A4' },
        { _id: 'f-angular', name: 'Angular', icon: '🅰️', color: '#DD0031' },
      ],
      documents: [
        { _id: 'doc-a', formationId: 'f-cyber', levelId: 'l-cyb-1', pageCount: 10 },
        { _id: 'doc-b', formationId: 'f-cyber', levelId: 'l-cyb-2', pageCount: 20 },
        { _id: 'doc-c', formationId: 'f-angular', levelId: 'l-ang-1', pageCount: 40 },
      ],
      grants: [
        // Cyber : niveau 2 seulement → doc-a exclu bien qu'il ait été lu.
        { _id: 'usr-1:f-cyber', userId: 'usr-1', formationId: 'f-cyber', levelIds: ['l-cyb-2'], documentIds: [] },
        // Angular : un seul document précis.
        { _id: 'usr-1:f-angular', userId: 'usr-1', formationId: 'f-angular', levelIds: ['l-ang-1'], documentIds: ['doc-c'] },
      ],
      progress: [
        { _id: 'usr-1:doc-a', userId: 'usr-1', documentId: 'doc-a', formationId: 'f-cyber', pagesRead: [1], pageCount: 10, completed: false, updatedAt: 100 },
        { _id: 'usr-1:doc-b', userId: 'usr-1', documentId: 'doc-b', formationId: 'f-cyber', pagesRead: [1, 2, 3, 4, 5], pageCount: 20, completed: false, updatedAt: 300 },
      ],
    });

    const dto = await service.learnerProgress('usr-1');
    const cyber = dto.formations.find((f) => f.formationId === 'f-cyber')!;
    expect(cyber.documentsTotal).toBe(1); // doc-b uniquement
    expect(cyber.pagesRead).toBe(5);
    expect(cyber.totalPages).toBe(20);
    expect(cyber.percent).toBe(25);

    const angular = dto.formations.find((f) => f.formationId === 'f-angular')!;
    expect(angular.documentsTotal).toBe(1); // doc-c
    expect(angular.percent).toBe(0); // jamais ouvert

    // Global : 5 pages lues sur 20 + 40 accessibles.
    expect(dto.globalPercent).toBe(8); // 5 / 60 ≈ 8,3 %
  });

  it('conserve une formation révoquée si des lectures existent (documents lus seulement)', async () => {
    const service = makeService({
      users: [USER],
      formations: [{ _id: 'f-old', name: 'Ancienne formation', icon: '📚', color: '#4F46E5' }],
      documents: [
        { _id: 'doc-x', formationId: 'f-old', levelId: 'l-1', pageCount: 8 },
        { _id: 'doc-y', formationId: 'f-old', levelId: 'l-1', pageCount: 8 },
      ],
      grants: [],
      progress: [
        { _id: 'usr-1:doc-x', userId: 'usr-1', documentId: 'doc-x', formationId: 'f-old', pagesRead: [1, 2, 3, 4], pageCount: 8, completed: false, updatedAt: 42 },
      ],
    });

    const dto = await service.learnerProgress('usr-1');
    expect(dto.formations).toHaveLength(1);
    expect(dto.totalFormations).toBe(1);

    const f = dto.formations[0];
    expect(f.documentsTotal).toBe(1); // seul doc-x a une lecture
    expect(f.pagesRead).toBe(4);
    expect(f.percent).toBe(50);
    expect(f.lastActivityAt).toBe(42);
  });

  it('pagine par fenêtre (offset/limit) en gardant les compteurs globaux sur tout', async () => {
    const service = makeService({
      users: [USER],
      formations: [
        { _id: 'f-a', name: 'Alpha', icon: 'book', color: '#111111' },
        { _id: 'f-b', name: 'Beta', icon: 'school', color: '#222222' },
        { _id: 'f-c', name: 'Gamma', icon: 'rocket', color: '#333333' },
      ],
      documents: [
        { _id: 'doc-a', formationId: 'f-a', levelId: 'l', pageCount: 10 },
        { _id: 'doc-b', formationId: 'f-b', levelId: 'l', pageCount: 10 },
        { _id: 'doc-c', formationId: 'f-c', levelId: 'l', pageCount: 10 },
      ],
      grants: ['f-a', 'f-b', 'f-c'].map((fid) => ({
        _id: `usr-1:${fid}`,
        userId: 'usr-1',
        formationId: fid,
        levelIds: [],
        documentIds: [],
      })),
      progress: [
        // 5 pages lues sur Alpha uniquement → global = 5/30 ≈ 17 %.
        { _id: 'usr-1:doc-a', userId: 'usr-1', documentId: 'doc-a', formationId: 'f-a', pagesRead: [1, 2, 3, 4, 5], pageCount: 10, completed: false, updatedAt: 10 },
      ],
    });

    // Fenêtre 1 : les 2 premières formations par ordre alphabétique.
    const page1 = await service.learnerProgress('usr-1', { offset: 0, limit: 2 });
    expect(page1.formations.map((f) => f.formationName)).toEqual(['Alpha', 'Beta']);
    expect(page1.totalFormations).toBe(3);
    expect(page1.globalPercent).toBe(17); // calculé sur les 3 formations

    // Fenêtre 2 : la suite.
    const page2 = await service.learnerProgress('usr-1', { offset: 2, limit: 2 });
    expect(page2.formations.map((f) => f.formationName)).toEqual(['Gamma']);
    expect(page2.totalFormations).toBe(3);

    // Sans pagination : tout, ordre alphabétique stable.
    const all = await service.learnerProgress('usr-1');
    expect(all.formations.map((f) => f.formationName)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});
