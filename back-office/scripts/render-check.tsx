/** Vérification runtime (SSR) de QueryGate + pages : `npm run test:render`. */
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../src/pages/DashboardPage';
import { AccessPage } from '../src/pages/AccessPage';

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
const formations = [{ id: 'f-hse', name: 'HSE & Sécurité' }];

// Grant « pré-migration » : ni levelIds ni documentIds (comme en base ancienne).
const legacyGrant = { _id: 'usr-1:f-hse', userId: 'usr-1', formationId: 'f-hse' };
const users = {
  items: [{ id: 'usr-1', firstName: 'Sophie', lastName: 'Martin', email: 'sophie@x.io' }],
};

function makeClient(seed: 'none' | 'dashboard' | 'access') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  if (seed === 'dashboard') {
    qc.setQueryData(['stats'], stats);
    qc.setQueryData(['formations'], formations);
  }
  if (seed === 'access') {
    qc.setQueryData(['grants'], [legacyGrant]);
    qc.setQueryData(['users'], users);
    qc.setQueryData(['formations'], formations);
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
check('dashboard pending → écran Chargement sans crash', htmlPending.includes('Chargement du tableau de bord'));
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

// 4) Sanity : pendant la capture, une liste volontairement cassée DOIT produire
// un warning — prouve que l'assertion suivante n'est pas vide.
const warningsBefore = reactErrors.filter((e) => e.includes('unique "key"')).length;
renderToString(
  <div>
    {[<span>a</span>, <span>b</span>]}
  </div>,
);
const warningsAfter = reactErrors.filter((e) => e.includes('unique "key"')).length;
check('sanity → la capture détecte un warning key volontaire', warningsAfter > warningsBefore);

console.error = originalError;

// 5) Aucun warning React « unique key » sur les rendus des pages.
check('aucun warning « unique key » sur les pages', warningsBefore === 0);

process.exit(failed ? 1 : 0);
