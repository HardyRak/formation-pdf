/** Vérification runtime (SSR) de QueryGate + pages : `npm run test:render`. */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../src/features/dashboard/pages/DashboardPage';
import { AccessPage } from '../src/features/access/pages/AccessPage';
import { FormationsPage } from '../src/features/formations/pages/FormationsPage';

const stats = {
  users: 3,
  managers: 1,
  learners: 2,
  formations: 2,
  levels: 5,
  documents: 12,
  grants: 4,
  perFormation: [
    { formationId: 'f-hse', documents: 8 },
    { formationId: 'f-cyb', documents: 4 },
  ],
};
const formations = [{ _id: 'f-hse', id: 'f-hse', name: 'HSE & Sécurité' }];

// Grant « pré-migration » : ni levelIds ni documentIds (comme en base ancienne).
const legacyGrant = { _id: 'usr-1:f-hse', userId: 'usr-1', formationId: 'f-hse' };
const users = {
  items: [{ id: 'usr-1', firstName: 'Sophie', lastName: 'Martin', email: 'sophie@x.io' }],
};

function makeClient(seed: 'none' | 'dashboard' | 'access' | 'formations') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  if (seed === 'dashboard') {
    qc.setQueryData(['stats'], stats);
    qc.setQueryData(['formations'], formations);
  }
  if (seed === 'access') {
    qc.setQueryData(['grants'], [legacyGrant]);
    qc.setQueryData(['user-titles', ['usr-1']], users);
    qc.setQueryData(['formation-titles', ['f-hse']], formations);
  }
  if (seed === 'formations') {
    qc.setQueryData(
      ['formations'],
      [
        {
          _id: 'f-ang',
          id: 'f-ang',
          name: 'Angular & Ionic',
          category: 'Développement',
          description: 'Applications mobiles hybrides.',
          icon: 'phone-portrait',
          color: '#6366F1',
          mandatory: false,
          order: 1,
          levelsCount: 3,
          documentsCount: 6,
          totalPages: 43,
        },
      ],
    );
  }
  return qc;
}

// renderToString insère des séparateurs <!-- --> entre nœuds texte : on normalise.
const norm = (html: string) => html.replace(/<!-- -->/g, '');

let failed = false;
function check(label: string, ok: boolean) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed = true;
}

// Capture les console.error React (warnings « key », erreurs de rendu…).
const reactErrors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  reactErrors.push(args.map(String).join(' '));
};

// 1) Dashboard, requête en cours : la fonction children ne doit PAS être appelée.
const htmlPending = renderToString(
  <QueryClientProvider client={makeClient('none')}>
    <DashboardPage />
  </QueryClientProvider>,
);
check(
  'dashboard pending → écran Chargement sans crash',
  htmlPending.includes('Chargement du tableau de bord'),
);
check('dashboard pending → pas de contenu dashboard', !htmlPending.includes('Tableau de bord</h1>'));

// 2) Dashboard, requête prête : la fonction children est appelée avec les données.
const htmlReady = renderToString(
  <QueryClientProvider client={makeClient('dashboard')}>
    <DashboardPage />
  </QueryClientProvider>,
);
check('dashboard ready → titre dashboard', htmlReady.includes('Tableau de bord'));
check('dashboard ready → nom formation résolu', htmlReady.includes('HSE &amp; Sécurité'));
check('dashboard ready → pourcentage calculé (67%)', norm(htmlReady).includes('67% du catalogue'));

// 3) AccessPage avec un grant ancien (champs tableau absents) : pas de crash.
const htmlAccess = renderToString(
  <QueryClientProvider client={makeClient('access')}>
    <AccessPage />
  </QueryClientProvider>,
);
check('access → grant legacy sans crash', htmlAccess.includes('Sophie Martin'));
check('access → grant legacy affiché « Tous les niveaux »', htmlAccess.includes('Tous les niveaux'));
check('access → grant legacy affiché « Tous les documents »', htmlAccess.includes('Tous les documents'));

// 4) FormationsPage : icône rendue en SVG inline (« trait ») + actions wrappées.
const htmlFormations = renderToString(
  <MemoryRouter>
    <QueryClientProvider client={makeClient('formations')}>
      <FormationsPage />
    </QueryClientProvider>
  </MemoryRouter>,
);
check('formations → carte rendue', norm(htmlFormations).includes('Angular &amp; Ionic'));
check(
  'formations → icône en SVG inline (trait currentColor)',
  htmlFormations.includes('<svg') && htmlFormations.includes('stroke='),
);
check(
  'formations → actions en flex-wrap (boutons ne débordent pas)',
  htmlFormations.includes('flex-wrap:wrap'),
);
check(
  'formations → grille assez large pour une ligne de boutons (340px)',
  htmlFormations.includes('minmax(340px, 1fr)'),
);

// 5) Sanity : pendant la capture, une liste volontairement cassée DOIT produire
// un warning — prouve que l'assertion suivante n'est pas vide.
const warningsBefore = reactErrors.filter((e) => e.includes('unique "key"')).length;
renderToString(<div>{[<span>a</span>, <span>b</span>]}</div>);
const warningsAfter = reactErrors.filter((e) => e.includes('unique "key"')).length;
check('sanity → la capture détecte un warning key volontaire', warningsAfter > warningsBefore);

console.error = originalError;

// 6) Aucun warning React « unique key » sur les rendus des pages.
check('aucun warning « unique key » sur les pages', warningsBefore === 0);

// 7) Backend ancien (réponses lean SANS `id`) : la couche API client
// normalise `_id` → `id` (régression du warning « unique key »).
async function apiNormalization(): Promise<void> {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = ((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/documents')
      ? [{ _id: 'doc-old', title: 'Doc ancien' }]
      : url.includes('/levels')
        ? [{ _id: 'l-old', name: 'Niveau ancien' }]
        : [{ _id: 'f-old', name: 'Formation ancienne' }];
    return Promise.resolve(
      new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
  }) as typeof fetch;

  const { formationService } = await import('../src/features/formations/services/formationService');
  const { levelService } = await import('../src/features/formations/services/levelService');
  const { documentService } = await import('../src/features/formations/services/documentService');
  const f = await formationService.list();
  check('api → formationService.list normalise _id en id (back ancien)', f[0]?.id === 'f-old');
  const l = await levelService.list('f-old');
  check('api → levelService.list normalise _id en id (back ancien)', l[0]?.id === 'l-old');
  const d = await documentService.list('l-old');
  check('api → documentService.list normalise _id en id (back ancien)', d[0]?.id === 'doc-old');
}

void apiNormalization().then(() => process.exit(failed ? 1 : 0));
