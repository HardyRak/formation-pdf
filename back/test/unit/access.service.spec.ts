import { AccessService, AccessibleDocument } from '../../src/access/access.service';

type Row = Record<string, unknown> & { _id: string };

/** Faux modèle Mongoose en mémoire, présentant l'interface utilisée par AccessService. */
class FakeGrantModel {
  private rows = new Map<string, Row>();

  private key(userId: string, formationId: string): string {
    return `${userId}:${formationId}`;
  }

  seed(userId: string, formationId: string, data: Partial<Row>): void {
    this.rows.set(this.key(userId, formationId), {
      _id: this.key(userId, formationId),
      userId,
      formationId,
      levelIds: [],
      documentIds: [],
      ...data,
    });
  }

  private query<T>(resolve: () => T | Promise<T>): any {
    let sortSpec: Record<string, unknown> | null = null;
    const run = (): Promise<unknown> =>
      Promise.resolve(sortSpec ? sortResult(resolve(), sortSpec) : resolve());
    const q: any = {
      lean: () => run(),
      sort: (spec: Record<string, unknown>) => {
        sortSpec = spec;
        return this.query(resolve);
      },
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        run().then(onFulfilled, onRejected),
    };
    return q;
  }

  findById(id: string) {
    return this.query(() => this.rows.get(id) ?? null);
  }

  find(filter?: object) {
    const f = (filter ?? {}) as Record<string, unknown>;
    const out = Array.from(this.rows.values()).filter(
      (row) =>
        (f.userId === undefined || row.userId === f.userId) &&
        (f.formationId === undefined || row.formationId === f.formationId),
    );
    return this.query(() => out);
  }

  findOne(filter: object) {
    const f = filter as Record<string, unknown>;
    const row =
      Array.from(this.rows.values()).find(
        (r) =>
          (f.userId === undefined || r.userId === f.userId) &&
          (f.documentIds === undefined ||
            (Array.isArray(r.documentIds) &&
              (r.documentIds as string[]).includes(f.documentIds as string))),
      ) ?? null;
    return this.query(() => row);
  }

  async exists(filter: object) {
    const row = await this.findOne(filter).lean();
    return row ? { _id: true } : null;
  }

  async findOneAndUpdate(filter: object, update: object): Promise<Row> {
    const f = filter as Record<string, unknown>;
    const id = f._id as string;
    const existing = this.rows.get(id) ?? {
      _id: id,
      userId: '',
      formationId: '',
      levelIds: [],
      documentIds: [],
    };
    const set = (update as { $set?: Record<string, unknown> }).$set ?? {};
    const merged = { ...existing, ...set };
    this.rows.set(id, merged);
    return merged;
  }

  async updateOne(filter: object, update: object) {
    const f = filter as Record<string, unknown>;
    const id = f._id as string;
    const row = this.rows.get(id);
    if (!row) return { modifiedCount: 0 };
    Object.assign(row, (update as { $set?: Record<string, unknown> }).$set ?? {});
    return { modifiedCount: 1 };
  }

  async deleteOne(filter: object) {
    const f = filter as Record<string, unknown>;
    const id = f._id as string;
    return { deletedCount: this.rows.delete(id) ? 1 : 0 };
  }
}

function sortResult(value: unknown, spec: Record<string, unknown>): unknown {
  if (!Array.isArray(value)) return value;
  const keys = Object.keys(spec);
  if (keys.length === 0) return value;
  const arr = [...value] as Record<string, unknown>[];
  arr.sort((a, b) => {
    for (const key of keys) {
      const dir = (spec[key] as number) === -1 ? -1 : 1;
      const av = a[key];
      const bv = b[key];
      if (av === bv) continue;
      return av == null ? dir : bv == null ? -dir : av < bv ? -dir : dir;
    }
    return 0;
  });
  return arr;
}

const learner = { id: 'usr-1', email: 's@x.io', role: 'LEARNER' as const };
const manager = { id: 'usr-2', email: 'm@x.io', role: 'MANAGER' as const };

const docHse1: AccessibleDocument = { _id: 'doc-hse-101', formationId: 'f-hse', levelId: 'l-hse-1' };
const docHse2: AccessibleDocument = { _id: 'doc-hse-102', formationId: 'f-hse', levelId: 'l-hse-2' };

function buildAccess() {
  const grants = new FakeGrantModel();
  const access = new AccessService(grants as never);
  return { grants, access };
}

describe('AccessService', () => {
  it('un LEARNER sans grant n\'a accès à rien', async () => {
    const { access } = buildAccess();
    await expect(access.canReadFormation(learner, 'f-hse')).resolves.toBe(false);
    await expect(access.canReadLevel(learner, 'f-hse', 'l-hse-1')).resolves.toBe(false);
    await expect(access.canReadDocument(learner, docHse1)).resolves.toBe(false);
  });

  it('un MANAGER a un accès total sans grant', async () => {
    const { access } = buildAccess();
    await expect(access.canReadFormation(manager, 'n-importe')).resolves.toBe(true);
    await expect(access.canReadLevel(manager, 'n-importe', 'l-x')).resolves.toBe(true);
    await expect(access.canReadDocument(manager, docHse1)).resolves.toBe(true);
  });

  it('accorder un document ouvre son niveau et sa formation (cascade)', async () => {
    const { access } = buildAccess();
    await access.upsertGrant('usr-1', 'f-hse', ['l-hse-1'], ['doc-hse-101']);
    await expect(access.canReadFormation(learner, 'f-hse')).resolves.toBe(true);
    await expect(access.canReadLevel(learner, 'f-hse', 'l-hse-1')).resolves.toBe(true);
    await expect(access.canReadLevel(learner, 'f-hse', 'l-hse-2')).resolves.toBe(false);
    await expect(access.canReadDocument(learner, docHse1)).resolves.toBe(true);
    await expect(access.canReadDocument(learner, docHse2)).resolves.toBe(false);
  });

  it('`levelIds: []` = accès à tous les niveaux et documents de la formation', async () => {
    const { access } = buildAccess();
    await access.upsertGrant('usr-1', 'f-hse', [], []);
    await expect(access.canReadLevel(learner, 'f-hse', 'l-hse-1')).resolves.toBe(true);
    await expect(access.canReadLevel(learner, 'f-hse', 'l-hse-2')).resolves.toBe(true);
    await expect(access.canReadDocument(learner, docHse2)).resolves.toBe(true);
  });

  it('upsert est fusionné (union des niveaux et documents)', async () => {
    const { access } = buildAccess();
    await access.upsertGrant('usr-1', 'f-hse', ['l-hse-1'], ['doc-hse-101']);
    await access.upsertGrant('usr-1', 'f-hse', ['l-hse-2'], ['doc-hse-102']);
    const grants = await access.listGrants('usr-1');
    expect(grants[0].levelIds).toEqual(expect.arrayContaining(['l-hse-1', 'l-hse-2']));
    expect(grants[0].documentIds).toEqual(expect.arrayContaining(['doc-hse-101', 'doc-hse-102']));
  });

  it('renseigne la date d’octroi (grantedAt) à chaque upsert', async () => {
    const { access } = buildAccess();
    await access.upsertGrant('usr-1', 'f-hse', ['l-hse-1'], ['doc-hse-101']);
    const grants = await access.listGrants('usr-1');
    expect(grants[0].grantedAt).toBeInstanceOf(Date);
  });

  it('révoquer un document parmi plusieurs conserve les autres', async () => {
    const { grants, access } = buildAccess();
    grants.seed('usr-3', 'f-cyber', {
      levelIds: ['l-cyb-1'],
      documentIds: ['doc-cyb-1', 'doc-cyb-2'],
    });
    const cyber1: AccessibleDocument = { _id: 'doc-cyb-1', formationId: 'f-cyber', levelId: 'l-cyb-1' };
    const cyber2: AccessibleDocument = { _id: 'doc-cyb-2', formationId: 'f-cyber', levelId: 'l-cyb-1' };
    await expect(access.revokeDocument('usr-3', 'doc-cyb-1')).resolves.toBe(true);
    await expect(access.canReadDocument({ ...learner, id: 'usr-3' }, cyber1)).resolves.toBe(false);
    await expect(access.canReadDocument({ ...learner, id: 'usr-3' }, cyber2)).resolves.toBe(true);
  });

  it('révoquer le DERNIER document ne ré-ouvre PAS tout le niveau (régression sécurité)', async () => {
    const { grants, access } = buildAccess();
    grants.seed('usr-5', 'f-hse', {
      levelIds: ['l-hse-1'],
      documentIds: ['doc-hse-101'],
    });
    const sibling: AccessibleDocument = { _id: 'doc-hse-999', formationId: 'f-hse', levelId: 'l-hse-1' };
    await expect(access.canReadDocument({ ...learner, id: 'usr-5' }, docHse1)).resolves.toBe(true);
    await expect(access.revokeDocument('usr-5', 'doc-hse-101')).resolves.toBe(true);
    // NI le document révoqué, NI les autres documents du niveau ne sont lisibles.
    await expect(access.canReadDocument({ ...learner, id: 'usr-5' }, docHse1)).resolves.toBe(false);
    await expect(access.canReadDocument({ ...learner, id: 'usr-5' }, sibling)).resolves.toBe(false);
    const after = await access.grantsFor({ ...learner, id: 'usr-5' });
    expect(after.formations).toHaveLength(0);
  });

  it('un grant ancien sans `documentIds` est normalisé', async () => {
    const { grants, access } = buildAccess();
    grants.seed('usr-4', 'f-old', {
      levelIds: ['l-old-1'],
      documentIds: undefined as unknown as string[],
    });
    const docOld: AccessibleDocument = { _id: 'doc-old-1', formationId: 'f-old', levelId: 'l-old-1' };
    await expect(access.canReadDocument({ ...learner, id: 'usr-4' }, docOld)).resolves.toBe(true);
    const listed = await access.listGrants('usr-4');
    expect(listed[0].documentIds).toEqual([]);
    expect(listed[0].levelIds).toEqual(['l-old-1']);
  });
});
