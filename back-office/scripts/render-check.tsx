/** Vérification runtime (SSR) de QueryGate + DashboardPage : `npm run test:render`. */
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../src/pages/DashboardPage';

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

function makeClient(seed: boolean) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  if (seed) {
    qc.setQueryData(['stats'], stats);
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

// 1) Requête en cours : isLoading=true → Loading, la fonction children ne doit PAS être appelée.
const htmlPending = renderToString(
  <QueryClientProvider client={makeClient(false)}>
    <DashboardPage />
  </QueryClientProvider>,
);
check('pending → écran Chargement sans crash', htmlPending.includes('Chargement du tableau de bord'));
check('pending → pas de contenu dashboard', !htmlPending.includes('Tableau de bord</h1>'));

// 2) Requête prête : la fonction children est appelée avec les données.
const htmlReady = renderToString(
  <QueryClientProvider client={makeClient(true)}>
    <DashboardPage />
  </QueryClientProvider>,
);
check('ready → titre dashboard', htmlReady.includes('Tableau de bord'));
check('ready → nom formation résolu', htmlReady.includes('HSE &amp; Sécurité'));
check('ready → pourcentage calculé (67%)', norm(htmlReady).includes('67% du catalogue'));

process.exit(failed ? 1 : 0);
