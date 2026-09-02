/**
 * Validation de la logique d'accès (cascade grant document → niveau → formation).
 * Exécution : node -r ts-node/register scripts/validate-access.ts
 *
 * Pas de MongoDB réel : on injecte un faux modèle Mongoose en mémoire dans
 * `AccessService` pour tester le VRAI code du service (`upsertGrant`,
 * `canReadDocument`, `canReadLevel`, `canReadFormation`, `revokeDocument`).
 */
import { AccessService, AccessibleDocument } from '../src/access/access.service';

/** Un faux modèle `AccessGrant` en mémoire, simulant l'interface Mongoose. */
class FakeGrantModel {
  private rows = new Map<string, Record<string, unknown>>();

  private key(userId: string, formationId: string): string {
    return `${userId}:${formationId}`;
  }

  seed(userId: string, formationId: string, data: object): void {
    this.rows.set(this.key(userId, formationId), {
      _id: this.key(userId, formationId),
      userId,
      formationId,
      levelIds: [],
      documentIds: [],
      ...data,
    });
  }

  /** Crée une "requête" chaînable façon Mongoose (thenable) : `.lean()` résout la donnée. */
  private query<T>(resolve: () => T | Promise<T>): any {
    let sortSpec: Record<string, unknown> | null = null;
    const run = (): Promise<unknown> =>
      Promise.resolve(sortSpec ? sortResult(resolve(), sortSpec) : resolve());
    const q: any = {
      lean: () => run(),
      sort: (spec: Record<string, unknown>) => {
        sortSpec = spec;
        return this.query<T>(resolve);
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
    const f = (filter ?? {}) as any;
    const out = Array.from(this.rows.values()).filter(
      (row) =>
        (f.userId === undefined || row.userId === f.userId) &&
        (f.formationId === undefined || row.formationId === f.formationId),
    );
    return this.query(() => out);
  }

  findOne(filter: object) {
    const f = filter as any;
    const row =
      Array.from(this.rows.values()).find(
        (r) =>
          (f.userId === undefined || r.userId === f.userId) &&
          (f.documentIds === undefined ||
            (Array.isArray(r.documentIds) &&
              (r.documentIds as string[]).includes(f.documentIds))),
      ) ?? null;
    return this.query(() => row);
  }

  async exists(filter: object) {
    const row = await this.findOne(filter).lean();
    return row ? { _id: true } : null;
  }

  async findOneAndUpdate(filter: object, update: object, _opts?: object) {
    const f = filter as any;
    const id = f._id;
    const existing = this.rows.get(id) ?? {
      _id: id,
      userId: '',
      formationId: '',
      levelIds: [],
      documentIds: [],
    };
    const set = (update as any).$set ?? {};
    const merged = { ...existing, ...set };
    this.rows.set(id, merged);
    return merged;
  }

  async updateOne(filter: object, update: object) {
    const f = filter as any;
    const id = f._id;
    const row = this.rows.get(id);
    if (!row) return { modifiedCount: 0 };
    Object.assign(row, (update as any).$set ?? {});
    return { modifiedCount: 1 };
  }

  async deleteOne(filter: object) {
    const f = filter as any;
    const id = f._id;
    const existed = this.rows.delete(id);
    return { deletedCount: existed ? 1 : 0 };
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`✗ ASSERTION ÉCHOUÉE : ${msg}`);
  console.log(`✓ ${msg}`);
}

/** Utilisateur fictif (profil JWT). */
const learner = { id: 'usr-1', email: 's@x.io', role: 'LEARNER' as const };
const manager = { id: 'usr-2', email: 'm@x.io', role: 'MANAGER' as const };

async function main(): Promise<number> {
  const grants = new FakeGrantModel();
  const access = new AccessService(grants as any);

  // Document = fiche avec formation + niveau.
  const doc: AccessibleDocument = {
    _id: 'doc-hse-101',
    formationId: 'f-hse',
    levelId: 'l-hse-1',
  };
  const doc2: AccessibleDocument = {
    _id: 'doc-hse-102',
    formationId: 'f-hse',
    levelId: 'l-hse-2',
  };

  console.log('--- 1. Sans grant : LEARNER n\'a RIEN ---');
  assert((await access.canReadFormation(learner, 'f-hse')) === false, 'formation verrouillée');
  assert((await access.canReadLevel(learner, 'f-hse', 'l-hse-1')) === false, 'niveau verrouillé');
  assert((await access.canReadDocument(learner, doc)) === false, 'document verrouillé');

  console.log('\n--- 2. Grant d\'un DOCUMENT (cascade niveau + formation) ---');
  // Admin : donne accès au document doc (niveau l-hse-1). Le service doit ouvrir
  // le niveau l-hse-1 (via grantDocument côté AdminService) et le grant porte documentIds.
  // Ici on simule l'upsert avec levelIds=[] et documentIds=[doc] après cascade : le
  // niveau doit être automatiquement inclus. On reproduit la cascade du AdminService.
  const effectiveLevels = await cascadeLevels(['l-hse-1'], ['doc-hse-101'], access);
  await access.upsertGrant('usr-1', 'f-hse', effectiveLevels, ['doc-hse-101']);

  assert((await access.canReadFormation(learner, 'f-hse')) === true, 'formation ouverte (cascade)');
  assert((await access.canReadLevel(learner, 'f-hse', 'l-hse-1')) === true, 'niveau du doc ouvert');
  assert((await access.canReadLevel(learner, 'f-hse', 'l-hse-2')) === false, 'autre niveau resté verrouillé');
  assert((await access.canReadDocument(learner, doc)) === true, 'document octroyé lisible');
  assert((await access.canReadDocument(learner, doc2)) === false, 'document non octroyé verrouillé');

  console.log('\n--- 3. Accès formation entière (levelIds=[]) → tout ouvert ---');
  await access.upsertGrant('usr-1', 'f-hse', [], []);
  assert((await access.canReadLevel(learner, 'f-hse', 'l-hse-1')) === true, 'tous niveaux ouverts');
  assert((await access.canReadLevel(learner, 'f-hse', 'l-hse-2')) === true, 'tous niveaux ouverts 2');
  assert((await access.canReadDocument(learner, doc2)) === true, 'tous documents ouverts');

  console.log('\n--- 4. Manager : accès total sans grant ---');
  assert((await access.canReadFormation(manager, 'n-importe')) === true, 'manager formation');
  assert((await access.canReadLevel(manager, 'n-importe', 'l-x')) === true, 'manager niveau');
  assert((await access.canReadDocument(manager, doc2)) === true, 'manager document');

  console.log('\n--- 5. Révocation d\'un document précis ---');
  grants.seed('usr-3', 'f-cyber', { levelIds: ['l-cyb-1'], documentIds: ['doc-cyb-1', 'doc-cyb-2'] });
  const docCyber: AccessibleDocument = { _id: 'doc-cyb-1', formationId: 'f-cyber', levelId: 'l-cyb-1' };
  const docCyber2: AccessibleDocument = { _id: 'doc-cyb-2', formationId: 'f-cyber', levelId: 'l-cyb-1' };
  assert((await access.canReadDocument({ ...learner, id: 'usr-3' }, docCyber)) === true, 'doc-cyb-1 lisible');

  // Retrait de doc-cyb-1 : reste doc-cyb-2 dans documentIds.
  const ok = await revokeOneDocument(grants, 'usr-3', 'doc-cyb-1');
  assert(ok === true, 'révocation document retourne true');
  const after = await access.grantsFor({ ...learner, id: 'usr-3' });
  assert(after.formations.length === 1, 'formation toujours présente');
  assert((await access.canReadDocument({ ...learner, id: 'usr-3' }, docCyber)) === false, 'doc-cyb-1 révoqué');
  assert((await access.canReadDocument({ ...learner, id: 'usr-3' }, docCyber2)) === true, 'doc-cyb-2 conservé');

  console.log('\n✅ TOUS LES TESTS D\'ACCÈS PASSENT.');
  return 0;
}

/** Reproduit la cascade du AdminService : un document apporte son niveau. */
async function cascadeLevels(
  levelIds: string[],
  documentIds: string[],
  access: AccessService,
): Promise<string[]> {
  if (documentIds.length === 0) return levelIds;
  const set = new Set(levelIds);
  // Simule la résolution des niveaux des documents (AdminService interroge la base).
  // Pour le test, on suppose que doc-hse-101 -> l-hse-1, doc-hse-102 -> l-hse-2.
  for (const docId of documentIds) {
    const levelId = documentLevel(docId);
    if (levelId) set.add(levelId);
  }
  return Array.from(set);
}

/** Applique un tri simple sur un tableau de documents (façon Mongoose `.sort()`). */
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

function documentLevel(documentId: string): string | null {
  const map: Record<string, string> = {
    'doc-hse-101': 'l-hse-1',
    'doc-hse-102': 'l-hse-2',
    'doc-cyb-1': 'l-cyb-1',
    'doc-cyb-2': 'l-cyb-1',
  };
  return map[documentId] ?? null;
}

/** Retire un document précis d'un grant (via API publique revokeDocument). */
async function revokeOneDocument(
  grants: FakeGrantModel,
  userId: string,
  docId: string,
): Promise<boolean> {
  const access = new AccessService(grants as any);
  return access.revokeDocument(userId, docId);
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
