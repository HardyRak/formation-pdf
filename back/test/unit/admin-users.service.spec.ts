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
  constructor(private readonly rows: Row[]) {}

  private match(filter: Record<string, unknown>): Row[] {
    return this.rows.filter((row) => {
      if (filter.role !== undefined && row.role !== filter.role) return false;
      const idFilter = filter._id as { $in?: string[] } | undefined;
      if (idFilter?.$in && !idFilter.$in.includes(row._id)) return false;
      const or = filter.$or as Record<string, RegExp>[] | undefined;
      if (or) {
        const ok = or.some((clause) =>
          Object.entries(clause).some(([field, re]) => re.test(String(row[field] ?? ''))),
        );
        if (!ok) return false;
      }
      return true;
    });
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

  it('filtre par liste d ids (libellés en lot) sans charger toute la liste', async () => {
    const service = new AdminUsersService(new FakeUsersModel(rows) as never);
    const list = await service.listUsers({ ids: 'usr-a,usr-c' });

    expect(list.total).toBe(2);
    expect(list.items.map((u) => u.id)).toEqual(['usr-a', 'usr-c']);
  });

  it('ne renvoie jamais passwordHash', async () => {
    const service = new AdminUsersService(new FakeUsersModel(rows) as never);
    const list = await service.listUsers({ page: 1, limit: 2 });
    for (const item of list.items) {
      expect(JSON.stringify(item)).not.toContain('passwordHash');
    }
  });
});
