import { signalStore } from '../core/state/create-store';
import { progressionStore, progressionPercent } from '../core/state/progression.store';
import { pdfReaderStore, ZOOM_STEPS } from '../core/state/pdf-reader.store';
import { catalogDb } from '../core/api/backend/catalog';
import { handleRequest, decodeJwt, DEMO_CREDENTIALS, b64 } from '../core/api/backend/server';
import { toApiError } from '../core/api/http-client';
import { mergeProgressEntries } from '../core/utils/progression-merge';
import {
  base64ToBytes,
  bytesToBase64,
  looksLikePdf,
  pdfDataUriAsync,
  utf8ToBytes,
} from '../core/utils/binary';
import { ROUTE_NAMES } from '../navigation/routes';
import type {
  AuthSession,
  DocumentProgress,
  FormationCategory,
  FormationPage,
  Level,
  TrainingDocument,
} from '../core/models';

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
    name: 'La recherche de formations est d\u00e9l\u00e9gu\u00e9e au backend (pagin\u00e9e)',
    run: async () => {
      const session = (await handleRequest({
        method: 'POST',
        path: '/auth/login',
        body: DEMO_CREDENTIALS,
      })) as AuthSession;
      const token = session.accessToken;

      const empty = (await handleRequest({
        method: 'GET',
        path: '/formations?page=1&limit=10&q=zzz-inexistant',
        token,
      })) as FormationPage;
      equal(empty.items.length, 0, 'La recherche serveur devrait \u00eatre vide');
      equal(empty.total, 0, 'Le total devrait \u00eatre nul');
      equal(empty.hasMore, false, 'hasMore devrait \u00eatre faux');
    },
  },
  {
    suite: 'Stores',
    name: 'Le filtre cat\u00e9gorie est appliqu\u00e9 par le backend',
    run: async () => {
      const session = (await handleRequest({
        method: 'POST',
        path: '/auth/login',
        body: DEMO_CREDENTIALS,
      })) as AuthSession;
      const token = session.accessToken;

      const categories = (await handleRequest({
        method: 'GET',
        path: '/formations/categories',
        token,
      })) as FormationCategory[];
      assert(categories.length > 0, 'Aucune cat\u00e9gorie retourn\u00e9e');

      const first = categories[0];
      const page = (await handleRequest({
        method: 'GET',
        path: `/formations?page=1&limit=50&category=${encodeURIComponent(first.name)}`,
        token,
      })) as FormationPage;
      equal(page.total, first.count, 'Le total filtr\u00e9 ne correspond pas au compteur');
      assert(
        page.items.every((formation) => formation.category === first.name),
        'Une formation hors cat\u00e9gorie a \u00e9t\u00e9 retourn\u00e9e',
      );
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

  // ---------------- Synchronisation serveur ----------------------
  {
    suite: 'Synchronisation',
    name: 'La fusion de progression est convergente (union des pages, LWW)',
    run: () => {
      const base = (updatedAt: number, pagesRead: number[], lastPage: number): DocumentProgress => ({
        documentId: 'doc-x',
        levelId: 'l-1',
        formationId: 'f-1',
        lastPage,
        pageCount: 10,
        pagesRead,
        percent: Math.round((pagesRead.length / 10) * 100),
        completed: pagesRead.length >= 10,
        updatedAt,
      });
      const ancien = base(1_000, [1, 2], 2);
      const recent = base(2_000, [2, 3, 4], 4);
      const fusion = mergeProgressEntries(ancien, recent);
      equal(fusion.pagesRead.length, 4, 'Les pages ne doivent jamais \u00eatre perdues');
      equal(fusion.lastPage, 4, 'La position doit venir de l\u2019entr\u00e9e la plus r\u00e9cente');
      equal(fusion.percent, 40, 'Le pourcentage doit \u00eatre recalcul\u00e9');
      equal(fusion.updatedAt, 2_000, 'updatedAt doit \u00eatre le plus r\u00e9cent');
      // Commutativit\u00e9 : l'ordre de fusion ne change pas le r\u00e9sultat.
      const inverse = mergeProgressEntries(recent, ancien);
      equal(JSON.stringify(inverse), JSON.stringify(fusion), 'La fusion doit \u00eatre commutative');
    },
  },
  {
    suite: 'Synchronisation',
    name: 'Le mock persiste la progression en \u00ab base \u00bb (PUT puis GET)',
    run: async () => {
      const login = (await handleRequest({
        method: 'POST',
        path: '/auth/login',
        body: DEMO_CREDENTIALS,
      })) as AuthSession;
      const token = login.accessToken;

      const saved = (await handleRequest({
        method: 'PUT',
        path: '/progression/documents/doc-sync-test',
        token,
        body: {
          levelId: 'l-1',
          formationId: 'f-1',
          lastPage: 5,
          pageCount: 10,
          pagesRead: [1, 2, 5],
          percent: 30,
          completed: false,
          updatedAt: Date.now(),
        },
      })) as DocumentProgress;
      equal(saved.percent, 30, 'Upsert invalide');

      // Rejeu idempotent avec une page de plus : fusion attendue.
      const merged = (await handleRequest({
        method: 'PUT',
        path: '/progression/documents/doc-sync-test',
        token,
        body: {
          levelId: 'l-1',
          formationId: 'f-1',
          lastPage: 6,
          pageCount: 10,
          pagesRead: [1, 2, 5, 6],
          percent: 40,
          completed: false,
          updatedAt: Date.now() + 1,
        },
      })) as DocumentProgress;
      equal(merged.pagesRead.length, 4, 'L\u2019union des pages doit \u00eatre conserv\u00e9e');

      const list = (await handleRequest({ method: 'GET', path: '/progression', token })) as DocumentProgress[];
      assert(list.some((e) => e.documentId === 'doc-sync-test'), 'Entr\u00e9e absente de la base');

      const reset = (await handleRequest({
        method: 'DELETE',
        path: '/progression/documents/doc-sync-test',
        token,
      })) as { success: boolean };
      equal(reset.success, true, 'Reset document invalide');
    },
  },
  {
    suite: 'Synchronisation',
    name: 'La progression refus\u00e9e sans authentification',
    run: async () => {
      try {
        await handleRequest({ method: 'GET', path: '/progression' });
        throw new Error('La route progression devrait \u00eatre prot\u00e9g\u00e9e');
      } catch (error) {
        equal(toApiError(error).status, 401, 'Statut HTTP incorrect');
      }
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

      const formationPage = (await handleRequest({
        method: 'GET',
        path: '/formations?page=1&limit=10',
        token,
      })) as FormationPage;
      const formations = formationPage.items;
      assert(formations.length > 0, 'Aucune formation retourn\u00e9e');
      assert(formations.length <= formationPage.limit, 'La page d\u00e9passe la taille demand\u00e9e');

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

  // ---------------- Binaire (lecteur PDF) ----------------------
  {
    suite: 'Binaire',
    name: 'base64 : aller-retour exact aux frontières de chunks',
    run: () => {
      const sizes = [0, 1, 2, 3, 4, 5, 32767, 32768, 32769, 65537];
      for (const size of sizes) {
        const bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) bytes[i] = (i * 7 + (i >> 8)) & 0xff;
        const encoded = bytesToBase64(bytes);
        // Aucun padding `=` ailleurs qu'en fin de chaîne (chunks multiples de 3).
        const padLen = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
        assert(
          !encoded.slice(0, encoded.length - padLen).includes('='),
          `Padding intermédiaire (taille ${size})`,
        );
        const decoded = base64ToBytes(encoded);
        equal(decoded.length, size, `Longueur incorrecte pour la taille ${size}`);
        const stride = Math.max(1, Math.floor(size / 64));
        for (let i = 0; i < size; i += stride) {
          if (decoded[i] !== bytes[i]) throw new Error(`Octet ${i} diffère (taille ${size})`);
        }
      }
    },
  },
  {
    suite: 'Binaire',
    name: 'looksLikePdf : en-tête magique détecté, même décalé',
    run: () => {
      const header = utf8ToBytes('%PDF-1.7\n%test');
      assert(looksLikePdf(header), 'En-tête valide non détecté');
      const shifted = new Uint8Array(300 + header.length);
      shifted.set(header, 300);
      assert(looksLikePdf(shifted), 'En-tête décalé non détecté');
      assert(!looksLikePdf(utf8ToBytes('{"status":404}')), 'JSON pris pour un PDF');
      assert(!looksLikePdf(new Uint8Array(0)), 'Contenu vide pris pour un PDF');
    },
  },
  {
    suite: 'Binaire',
    name: 'pdfDataUriAsync : data URI décodable en octets identiques',
    run: async () => {
      // Traverse plusieurs chunks d'encodage (32 Ko synchrone, 512 Ko async).
      const bytes = new Uint8Array(600000);
      for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31) & 0xff;
      const uri = await pdfDataUriAsync(bytes);
      const prefix = 'data:application/pdf;base64,';
      assert(uri.startsWith(prefix), 'Préfixe data URI invalide');
      const decoded = base64ToBytes(uri.slice(prefix.length));
      equal(decoded.length, bytes.length, 'Longueur incorrecte après encodage async');
      for (let i = 0; i < bytes.length; i += 997) {
        if (decoded[i] !== bytes[i]) throw new Error(`Octet ${i} diffère`);
      }
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      result = {
        suite: testCase.suite,
        name: testCase.name,
        passed: false,
        durationMs: Date.now() - started,
        detail: message,
      };
    }
    results.push(result);
    onProgress?.(result);
  }
  return results;
}
