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

/** Faux modèle du référentiel `categories` (source de vérité du filtre). */
class FakeCategoriesModel {
  constructor(public readonly rows: Row[]) {}

  find(): { sort: () => { lean: () => Promise<Row[]> } } {
    const sorted = [...this.rows].sort(
      (a, b) =>
        Number(a.order ?? 0) - Number(b.order ?? 0) ||
        String(a.name).localeCompare(String(b.name)),
    );
    return { sort: () => ({ lean: () => Promise.resolve(sorted) }) };
  }
}

const category = (id: string, name: string, order: number): Row => ({ _id: id, name, order });

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
      new FakeCategoriesModel([]) as never,
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
  const build = (formations: Row[], categories: Row[]) =>
    new CatalogService(
      new FakeFormationsModel(formations) as never,
      new FakeCategoriesModel(categories) as never,
      {} as never,
      {} as never,
    );

  it('lit le référentiel et y joint les compteurs de formations', async () => {
    const service = build(
      [
        formation('f-1', 1, 'A', 'Développement'),
        formation('f-2', 2, 'B', 'HSE'),
        formation('f-3', 3, 'C', 'HSE'),
      ],
      [category('cat-dev', 'Développement', 1), category('cat-hse', 'HSE', 2)],
    );

    await expect(service.listCategories()).resolves.toEqual([
      { name: 'Développement', count: 1 },
      { name: 'HSE', count: 2 },
    ]);
  });

  it("respecte l'ordre du référentiel, pas l'ordre alphabétique", async () => {
    const service = build(
      [formation('f-1', 1, 'A', 'Zéro déchet'), formation('f-2', 2, 'B', 'Alpha')],
      [category('cat-z', 'Zéro déchet', 1), category('cat-a', 'Alpha', 2)],
    );

    const result = await service.listCategories();
    expect(result.map((item) => item.name)).toEqual(['Zéro déchet', 'Alpha']);
  });

  it('expose une catégorie du référentiel sans formation (count = 0)', async () => {
    const service = build(
      [formation('f-1', 1, 'A', 'HSE')],
      [category('cat-hse', 'HSE', 1), category('cat-vide', 'Nouvelle catégorie', 2)],
    );

    await expect(service.listCategories()).resolves.toEqual([
      { name: 'HSE', count: 1 },
      { name: 'Nouvelle catégorie', count: 0 },
    ]);
  });

  it('joint les compteurs malgré une différence de casse sur Formation.category', async () => {
    const service = build(
      [formation('f-1', 1, 'A', 'hse'), formation('f-2', 2, 'B', 'HSE')],
      [category('cat-hse', 'HSE', 1)],
    );

    await expect(service.listCategories()).resolves.toEqual([{ name: 'HSE', count: 2 }]);
  });

  it("ignore une catégorie orpheline absente du référentiel", async () => {
    const service = build(
      [formation('f-1', 1, 'A', 'Obsolète')],
      [category('cat-hse', 'HSE', 1)],
    );

    await expect(service.listCategories()).resolves.toEqual([{ name: 'HSE', count: 0 }]);
  });
});
