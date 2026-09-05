import { CatalogService } from '../../src/catalog/catalog.service';

type Row = Record<string, unknown> & { _id: string };

/** Chaîne de requête minimale (`sort → skip → limit → lean`). */
interface FakeQuery {
  sort: () => FakeQuery;
  skip: (n: number) => FakeQuery;
  limit: (n: number) => FakeQuery;
  lean: () => Promise<Row[]>;
}

/**
 * Faux modèle Mongoose en mémoire pour `formations` : couvre le filtre
 * `category` (regex ancrée), la recherche `$or` et la pagination.
 */
class FakeFormationsModel {
  constructor(public readonly rows: Row[]) {}

  private matchClause(row: Row, key: string, value: unknown): boolean {
    if (typeof value === 'object' && value !== null && '$regex' in (value as object)) {
      const { $regex, $options } = value as { $regex: string; $options?: string };
      return new RegExp($regex, $options).test(String(row[key] ?? ''));
    }
    return row[key] === value;
  }

  private matches(row: Row, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$or') {
        const clauses = value as Record<string, unknown>[];
        const ok = clauses.some((clause) =>
          Object.entries(clause).every(([field, cond]) => this.matchClause(row, field, cond)),
        );
        if (!ok) return false;
        continue;
      }
      if (!this.matchClause(row, key, value)) return false;
    }
    return true;
  }

  private match(filter: Record<string, unknown>): Row[] {
    return this.rows.filter((row) => this.matches(row, filter));
  }

  find(filter: Record<string, unknown> = {}): FakeQuery {
    const sorted = [...this.match(filter)].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
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

  async aggregate<T>(): Promise<T[]> {
    const counts = new Map<string, number>();
    this.rows.forEach((row) => {
      const category = String(row.category ?? '');
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => a._id.localeCompare(b._id)) as unknown as T[];
  }
}

const formation = (id: string, order: number, name: string, category: string, description = ''): Row => ({
  _id: id,
  name,
  description,
  category,
  icon: 'book',
  color: '#4F46E5',
  order,
  levelsCount: 1,
  documentsCount: 1,
  totalPages: 10,
  durationMinutes: 60,
  mandatory: false,
});

describe('CatalogService.listFormations', () => {
  const rows = [
    formation('f-1', 1, 'Angular & Ionic', 'Développement', 'Applications mobiles hybrides'),
    formation('f-2', 2, 'Sécurité au travail', 'HSE', 'Prévention des risques'),
    formation('f-3', 3, 'Cybersécurité & RGPD', 'Conformité', 'Protection des données'),
    formation('f-4', 4, 'Gestes et postures', 'HSE', 'Manutention manuelle'),
    formation('f-5', 5, 'React Native avancé', 'Développement', 'Applications performantes'),
  ];

  const service = () =>
    new CatalogService(
      new FakeFormationsModel(rows) as never,
      {} as never,
      {} as never,
    );

  it('pagine le catalogue et expose hasMore', async () => {
    const first = await service().listFormations({ page: 1, limit: 2 });
    expect(first.items.map((item) => item.id)).toEqual(['f-1', 'f-2']);
    expect(first.total).toBe(5);
    expect(first.hasMore).toBe(true);

    const last = await service().listFormations({ page: 3, limit: 2 });
    expect(last.items.map((item) => item.id)).toEqual(['f-5']);
    expect(last.hasMore).toBe(false);
  });

  it('recherche sur le nom, la description et la catégorie', async () => {
    const byName = await service().listFormations({ q: 'angular' });
    expect(byName.items.map((item) => item.id)).toEqual(['f-1']);

    const byDescription = await service().listFormations({ q: 'risques' });
    expect(byDescription.items.map((item) => item.id)).toEqual(['f-2']);

    const byCategory = await service().listFormations({ q: 'hse' });
    expect(byCategory.items.map((item) => item.id)).toEqual(['f-2', 'f-4']);
  });

  it('filtre par catégorie exacte, insensible à la casse', async () => {
    const result = await service().listFormations({ category: 'hse' });
    expect(result.total).toBe(2);
    expect(result.items.every((item) => item.category === 'HSE')).toBe(true);
  });

  it('combine recherche et filtre catégorie', async () => {
    const result = await service().listFormations({ q: 'postures', category: 'HSE' });
    expect(result.items.map((item) => item.id)).toEqual(['f-4']);
  });

  it('échappe les métacaractères de la recherche', async () => {
    const result = await service().listFormations({ q: 'Cybersécurité & RGPD' });
    expect(result.items.map((item) => item.id)).toEqual(['f-3']);
  });

  it('renvoie une page vide sans erreur au-delà du dernier élément', async () => {
    const result = await service().listFormations({ page: 10, limit: 10 });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(false);
  });
});

describe('CatalogService.listCategories', () => {
  it('agrège les catégories du catalogue avec leur volumétrie', async () => {
    const service = new CatalogService(
      new FakeFormationsModel([
        formation('f-1', 1, 'A', 'Développement'),
        formation('f-2', 2, 'B', 'HSE'),
        formation('f-3', 3, 'C', 'HSE'),
      ]) as never,
      {} as never,
      {} as never,
    );

    await expect(service.listCategories()).resolves.toEqual([
      { name: 'Développement', count: 1 },
      { name: 'HSE', count: 2 },
    ]);
  });
});
