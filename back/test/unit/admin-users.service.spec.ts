import { AdminUsersService } from '../../src/admin/admin-users.service';

type Row = Record<string, unknown> & { _id: string };

/** Chaîne de requête minimale (`sort → skip → limit → lean`). */
interface FakeQuery {
  sort: () => FakeQuery;
  skip: (n: number) => FakeQuery;
  limit: (n: number) => FakeQuery;
  lean: () => Promise<Row[]>;
}

/**
 * Faux modèle Mongoose en mémoire pour `users` : suffit à couvrir
 * `find(filter).sort().skip().limit().lean()` et `countDocuments(filter)`.
 */
class FakeUsersModel {
  constructor(public readonly rows: Row[]) {}

  private matches(row: Row, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith('$')) continue;
      if (typeof value === 'object' && value !== null && '$ne' in (value as object)) {
        const ne = (value as { $ne?: unknown }).$ne;
        if (row[key] === ne) return false;
      } else if (row[key] !== value) {
        return false;
      }
    }
    if (filter.role !== undefined && row.role !== filter.role) return false;

    const or = filter.$or as Record<string, RegExp>[] | undefined;
    if (or) {
      const ok = or.some((clause) =>
        Object.entries(clause).some(([field, re]) => re.test(String(row[field] ?? ''))),
      );
      if (!ok) return false;
    }

    const and = filter.$and as Record<string, unknown>[] | undefined;
    if (and) {
      const ok = and.every((clause) => this.matches(row, clause));
      if (!ok) return false;
    }

    return true;
  }

  private match(filter: Record<string, unknown>): Row[] {
    return this.rows.filter((row) => this.matches(row, filter));
  }

  find(filter: Record<string, unknown> = {}): FakeQuery {
    const sorted = [...this.match(filter)].sort(
      (a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0),
    );
    const window = { skip: 0, limit: sorted.length };
    const chain: FakeQuery = {
      sort: () => chain,
      skip: (n: number) => {
        window.skip = n;
        return chain;
      },
      limit: (n: number) => {
        window.limit = n;
        return chain;
      },
      lean: () => Promise.resolve(sorted.slice(window.skip, window.skip + window.limit)),
    };
    return chain;
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    return this.match(filter).length;
  }

  async create(doc: Row): Promise<Row> {
    this.rows.push(doc);
    return doc;
  }

  findOne(filter: Record<string, unknown> = {}) {
    const row = this.match(filter)[0];
    return { lean: () => Promise.resolve(row ?? null) };
  }

  findById(id: string) {
    const row = this.rows.find((r) => r._id === id);
    return { lean: () => Promise.resolve(row ?? null) };
  }

  async updateOne(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
    const row = this.rows.find((r) => r._id === filter._id);
    if (row) Object.assign(row, update.$set);
    return { modifiedCount: row ? 1 : 0 };
  }
}

const base = (id: string, createdAt: number, extra: Record<string, unknown> = {}): Row => ({
  email: `${id}@pdftrain.io`,
  passwordHash: 'xxx',
  firstName: id.toUpperCase(),
  lastName: 'Test',
  role: 'LEARNER',
  company: '',
  avatarColor: '#4F46E5',
  createdAt,
  ...extra,
  _id: id,
});

describe('AdminUsersService.listUsers', () => {
  const rows = [
    base('usr-a', 5),
    base('usr-b', 4),
    base('usr-c', 3),
    base('usr-d', 2, { role: 'MANAGER' }),
    base('usr-e', 1),
  ];

  it('renvoie toute la liste (sans pagination) avec le contrat historique', async () => {
    const service = new AdminUsersService(new FakeUsersModel(rows) as never);
    const list = await service.listUsers();

    expect(list.total).toBe(5);
    expect(list.items).toHaveLength(5);
    expect(list.items[0].id).toBe('usr-a');
    expect(list.page).toBeUndefined();
    expect(list.totalPages).toBeUndefined();
  });

  it('pagine (page/limit) et expose les métadonnées de pagination', async () => {
    const service = new AdminUsersService(new FakeUsersModel(rows) as never);
    const list = await service.listUsers({ page: 2, limit: 2 });

    expect(list.total).toBe(5);
    expect(list.totalPages).toBe(3);
    expect(list.page).toBe(2);
    expect(list.items.map((u) => u.id)).toEqual(['usr-c', 'usr-d']);
  });

  it('filtre par rôle et recherche avant de paginer', async () => {
    const service = new AdminUsersService(new FakeUsersModel(rows) as never);
    const list = await service.listUsers({ role: 'MANAGER', page: 1, limit: 10 });

    expect(list.total).toBe(1);
    expect(list.items.map((u) => u.id)).toEqual(['usr-d']);

    const searched = await service.listUsers({ q: 'usr-b', page: 1, limit: 10 });
    expect(searched.items.map((u) => u.id)).toEqual(['usr-b']);
  });

  it('recherche multi-mots sur prénom + nom (sophie mar → sophie martin)', async () => {
    const martin = base('usr-martin', 10, {
      firstName: 'Sophie',
      lastName: 'Martin',
    });
    const service = new AdminUsersService(new FakeUsersModel([...rows, martin]) as never);
    const list = await service.listUsers({ q: 'sophie mar', page: 1, limit: 10 });

    expect(list.items.map((u) => u.id)).toEqual(['usr-martin']);
  });

  it('recherche aussi via fullName (comptes récents)', async () => {
    const smith = base('usr-smith', 10, {
      firstName: '',
      lastName: '',
      fullName: 'Sophie Martin',
    });
    const service = new AdminUsersService(new FakeUsersModel([...rows, smith]) as never);
    const list = await service.listUsers({ q: 'sophie martin', page: 1, limit: 10 });

    expect(list.items.map((u) => u.id)).toEqual(['usr-smith']);
  });

  it('renseigne fullName à la création', async () => {
    const model = new FakeUsersModel([...rows]);
    const service = new AdminUsersService(model as never);
    const created = await service.createUser({
      email: 'jean.dupont@x.io',
      password: 'password123',
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'LEARNER',
    });

    expect(model.rows.some((r) => r._id === created.id && r.fullName === 'Jean Dupont')).toBe(true);
  });

  it('recalcule fullName quand le prénom change', async () => {
    const model = new FakeUsersModel([...rows]);
    const service = new AdminUsersService(model as never);
    await service.updateUser('usr-a', { firstName: 'Jean' });

    const updated = model.rows.find((r) => r._id === 'usr-a');
    expect(updated?.fullName).toBe('Jean Test');
  });

  it('ne renvoie jamais passwordHash', async () => {
    const service = new AdminUsersService(new FakeUsersModel(rows) as never);
    const list = await service.listUsers({ page: 1, limit: 2 });
    for (const item of list.items) {
      expect(JSON.stringify(item)).not.toContain('passwordHash');
    }
  });
});
