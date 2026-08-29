import { signalStore } from '../core/state/create-store';
import { progressionStore, progressionPercent } from '../core/state/progression.store';
import { formationStore } from '../core/state/formation.store';
import { pdfReaderStore, ZOOM_STEPS } from '../core/state/pdf-reader.store';
import { catalogDb } from '../core/api/backend/catalog';
import { handleRequest, decodeJwt, DEMO_CREDENTIALS, b64 } from '../core/api/backend/server';
import { toApiError } from '../core/api/http-client';
import { ROUTE_NAMES } from '../navigation/routes';
import type { AuthSession, Formation, Level, TrainingDocument } from '../core/models';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  detail?: string;
}

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (attendu: ${String(expected)}, re\u00e7u: ${String(actual)})`);
  }
};

interface TestCase {
  suite: string;
  name: string;
  run: () => void | Promise<void>;
}

const cases: TestCase[] = [
  // ---------------- Stores -------------------------------------
  {
    suite: 'Stores',
    name: 'signalStore notifie les abonn\u00e9s sur patchState',
    run: () => {
      const store = signalStore('Test', { count: 0, label: 'a' });
      let notifications = 0;
      const off = store.subscribe(() => (notifications += 1));
      store.patchState({ count: 1 });
      store.patchState({ count: 1 }); // aucun changement -> pas d'\u00e9mission
      store.patchState({ label: 'b' });
      off();
      store.patchState({ count: 9 });
      equal(notifications, 2, 'Nombre d\u2019\u00e9missions incorrect');
      equal(store.state().count, 9, 'Etat final incorrect');
    },
  },
  {
    suite: 'Stores',
    name: 'signalStore.reset restaure l\u2019\u00e9tat initial',
    run: () => {
      const store = signalStore('Test', { value: 'init' });
      store.patchState({ value: 'modified' });
      store.reset();
      equal(store.state().value, 'init', 'Reset invalide');
    },
  },
  {
    suite: 'Stores',
    name: 'FormationStore filtre par nom, description et cat\u00e9gorie',
    run: () => {
      const previous = formationStore.state().query;
      const total = formationStore.state().items.length;
      formationStore.setQuery('zzz-inexistant');
      equal(formationStore.filtered().length, 0, 'Le filtre devrait \u00eatre vide');
      formationStore.setQuery('');
      equal(formationStore.filtered().length, total, 'Le filtre vide doit tout retourner');
      formationStore.setQuery(previous);
    },
  },
  {
    suite: 'Stores',
    name: 'ProgressionStore calcule le pourcentage et la reprise',
    run: () => {
      const doc: TrainingDocument = {
        id: 'test-doc',
        levelId: 'test-level',
        formationId: 'test-formation',
        order: 1,
        title: 'Doc de test',
        description: '',
        pageCount: 10,
        sizeKb: 100,
        updatedAt: new Date().toISOString(),
      };
      progressionStore.trackPage(doc, 3);
      progressionStore.trackPage(doc, 4);
      const entry = progressionStore.documentProgress('test-doc');
      assert(!!entry, 'Progression non enregistr\u00e9e');
      equal(entry?.percent, 20, 'Pourcentage document incorrect');
      equal(progressionStore.resumePage('test-doc'), 4, 'Page de reprise incorrecte');
      equal(progressionStore.levelPercent('test-level', 10), 20, 'Pourcentage niveau incorrect');
      equal(progressionStore.formationPercent('test-formation', 20), 10, 'Pourcentage formation incorrect');
      progressionStore.resetDocument('test-doc');
      equal(progressionStore.documentProgress('test-doc'), null, 'Le reset document a \u00e9chou\u00e9');
    },
  },
  {
    suite: 'Stores',
    name: 'progressionPercent borne les valeurs entre 0 et 100',
    run: () => {
      equal(progressionPercent(0, 0), 0, 'Division par z\u00e9ro non g\u00e9r\u00e9e');
      equal(progressionPercent(15, 10), 100, 'Valeur non born\u00e9e');
      equal(progressionPercent(1, 3), 33, 'Arrondi incorrect');
    },
  },

  // ---------------- Services API --------------------------------
  {
    suite: 'Services API',
    name: 'POST /auth/login rejette des identifiants invalides',
    run: async () => {
      try {
        await handleRequest({ method: 'POST', path: '/auth/login', body: { email: 'x@y.fr', password: 'nope' } });
        throw new Error('La requ\u00eate aurait d\u00fb \u00e9chouer');
      } catch (error) {
        const api = toApiError(error);
        equal(api.status, 401, 'Statut HTTP incorrect');
        equal(api.code, 'INVALID_CREDENTIALS', 'Code d\u2019erreur incorrect');
      }
    },
  },
  {
    suite: 'Services API',
    name: 'POST /auth/login d\u00e9livre un JWT valide',
    run: async () => {
      const session = (await handleRequest({
        method: 'POST',
        path: '/auth/login',
        body: DEMO_CREDENTIALS,
      })) as AuthSession;
      const payload = decodeJwt(session.accessToken);
      assert(!!payload, 'Jeton illisible');
      equal(payload?.typ, 'access', 'Type de jeton incorrect');
      assert((payload?.exp ?? 0) > Date.now(), 'Le jeton est d\u00e9j\u00e0 expir\u00e9');
      assert(!!session.refreshToken, 'Refresh token manquant');
    },
  },
  {
    suite: 'Services API',
    name: 'Les routes prot\u00e9g\u00e9es refusent un appel anonyme',
    run: async () => {
      try {
        await handleRequest({ method: 'GET', path: '/formations' });
        throw new Error('La route devrait \u00eatre prot\u00e9g\u00e9e');
      } catch (error) {
        equal(toApiError(error).status, 401, 'Statut HTTP incorrect');
      }
    },
  },
  {
    suite: 'Services API',
    name: 'Un jeton expir\u00e9 renvoie TOKEN_EXPIRED',
    run: async () => {
      const expired = ['x', b64(JSON.stringify({ sub: 'usr-1', email: 'a@b.c', typ: 'access', iat: 0, exp: 1 })), 'sig'].join('.');
      try {
        await handleRequest({ method: 'GET', path: '/formations', token: expired });
        throw new Error('Le jeton expir\u00e9 aurait d\u00fb \u00eatre rejet\u00e9');
      } catch (error) {
        equal(toApiError(error).code, 'TOKEN_EXPIRED', 'Code d\u2019erreur incorrect');
      }
    },
  },
  {
    suite: 'Services API',
    name: 'Le catalogue est coh\u00e9rent (niveaux, documents, pages)',
    run: () => {
      const db = catalogDb();
      assert(db.formations.length >= 4, 'Catalogue incomplet');
      db.formations.forEach((formation) => {
        const levels = db.levels.filter((l) => l.formationId === formation.id);
        equal(levels.length, formation.levelsCount, `Niveaux incoh\u00e9rents pour ${formation.id}`);
        const docs = db.documents.filter((doc) => doc.formationId === formation.id);
        equal(docs.length, formation.documentsCount, `Documents incoh\u00e9rents pour ${formation.id}`);
        const pages = docs.reduce((sum, doc) => sum + doc.pageCount, 0);
        equal(pages, formation.totalPages, `Total de pages incoh\u00e9rent pour ${formation.id}`);
      });
    },
  },

  // ---------------- Navigation ----------------------------------
  {
    suite: 'Navigation',
    name: 'Le parcours Login \u2192 Formations \u2192 Niveaux \u2192 Documents \u2192 Lecteur est d\u00e9clar\u00e9',
    run: () => {
      ['Login', 'Tabs', 'Levels', 'Documents', 'Reader'].forEach((route) => {
        assert((ROUTE_NAMES as readonly string[]).includes(route), `Route manquante : ${route}`);
      });
    },
  },

  // ---------------- Lecteur PDF ---------------------------------
  {
    suite: 'Lecteur PDF',
    name: 'Le flux document expose des pages structur\u00e9es sans URL publique',
    run: async () => {
      const session = (await handleRequest({
        method: 'POST',
        path: '/auth/login',
        body: DEMO_CREDENTIALS,
      })) as AuthSession;
      const db = catalogDb();
      const doc = db.documents[0];
      const stream = (await handleRequest({
        method: 'GET',
        path: `/documents/${doc.id}/stream`,
        token: session.accessToken,
      })) as { pages: any[] };
      equal(stream.pages.length, doc.pageCount, 'Nombre de pages incorrect');
      assert(
        !JSON.stringify(stream).includes('http'),
        'Le flux ne doit contenir aucune URL publique',
      );
      assert(stream.pages[0].blocks.length > 0, 'Page vide');
    },
  },
  {
    suite: 'Lecteur PDF',
    name: 'Le zoom reste dans les bornes autoris\u00e9es',
    run: () => {
      pdfReaderStore.close();
      for (let i = 0; i < 12; i += 1) pdfReaderStore.zoomIn();
      equal(pdfReaderStore.state().zoomIndex, ZOOM_STEPS.length - 1, 'Zoom maximum non born\u00e9');
      for (let i = 0; i < 12; i += 1) pdfReaderStore.zoomOut();
      equal(pdfReaderStore.state().zoomIndex, 0, 'Zoom minimum non born\u00e9');
      pdfReaderStore.resetZoom();
      equal(pdfReaderStore.zoom(), 1, 'R\u00e9initialisation du zoom incorrecte');
    },
  },
  {
    suite: 'Lecteur PDF',
    name: 'setPage ignore les pages hors limites',
    run: () => {
      pdfReaderStore.close();
      pdfReaderStore.setPage(5);
      equal(pdfReaderStore.state().currentPage, 1, 'Aucun document ouvert : la page ne doit pas changer');
    },
  },

  // ---------------- E2E -----------------------------------------
  {
    suite: 'E2E',
    name: 'Parcours complet : connexion \u2192 formation \u2192 niveau \u2192 document \u2192 lecture',
    run: async () => {
      const session = (await handleRequest({
        method: 'POST',
        path: '/auth/login',
        body: DEMO_CREDENTIALS,
      })) as AuthSession;
      const token = session.accessToken;

      const formations = (await handleRequest({ method: 'GET', path: '/formations', token })) as Formation[];
      assert(formations.length > 0, 'Aucune formation retourn\u00e9e');

      const levels = (await handleRequest({
        method: 'GET',
        path: `/formations/${formations[0].id}/levels`,
        token,
      })) as Level[];
      assert(levels.length > 0, 'Aucun niveau retourn\u00e9');
      equal(levels[0].order, 1, 'Les niveaux ne sont pas ordonn\u00e9s');

      const documents = (await handleRequest({
        method: 'GET',
        path: `/levels/${levels[0].id}/documents`,
        token,
      })) as TrainingDocument[];
      assert(documents.length > 0, 'Aucun document retourn\u00e9');

      const stream = (await handleRequest({
        method: 'GET',
        path: `/documents/${documents[0].id}/stream`,
        token,
      })) as { pages: any[] };
      equal(stream.pages.length, documents[0].pageCount, 'Flux incomplet');

      // progression sur un document r\u00e9el puis nettoyage
      progressionStore.trackPage(documents[0], 2);
      equal(progressionStore.resumePage(documents[0].id), 2, 'Reprise non enregistr\u00e9e');
      progressionStore.resetDocument(documents[0].id);
    },
  },
];

export const TEST_COUNT = cases.length;

export async function runTestSuite(onProgress?: (result: TestResult) => void): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const testCase of cases) {
    const started = Date.now();
    let result: TestResult;
    try {
      await testCase.run();
      result = { suite: testCase.suite, name: testCase.name, passed: true, durationMs: Date.now() - started };
    } catch (error: any) {
      result = {
        suite: testCase.suite,
        name: testCase.name,
        passed: false,
        durationMs: Date.now() - started,
        detail: error?.message ?? String(error),
      };
    }
    results.push(result);
    onProgress?.(result);
  }
  return results;
}
