/**
 * Vérifie que le vrai <App/> appelle bien `bootstrap()` au montage
 * (régression « bloqué sur Chargement… » après actualisation, ec30199).
 * Monte l'application complète sous jsdom : sans cet effet, le store reste
 * `bootstrapping: true` et RequireManager affiche « Chargement… » pour toujours.
 * `npm run test:boot`.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

function defineGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
defineGlobal('window', dom.window);
defineGlobal('document', dom.window.document);
defineGlobal('navigator', dom.window.navigator);
defineGlobal('localStorage', dom.window.localStorage);
defineGlobal('HTMLElement', dom.window.HTMLElement);
defineGlobal('CustomEvent', dom.window.CustomEvent);
defineGlobal('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));

let failed = false;
function check(label: string, ok: boolean) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed = true;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  // Import APRÈS la mise en place du DOM (react-dom lit `document` au chargement).
  const { createRoot } = await import('react-dom/client');
  const { App } = await import('../src/app/App');
  const { useSessionStore } = await import('../src/features/auth/session.store');

  // État initial du store : bloquant tant que bootstrap() n'a pas tourné.
  check(
    'store → bootstrapping=true avant montage (état bloquant initial)',
    useSessionStore.getState().bootstrapping === true,
  );

  // 1) Sans session stockée : le montage de <App/> doit débloquer l'écran.
  const container = dom.window.document.getElementById('root')!;
  createRoot(container).render(<App />);
  await sleep(150);
  check(
    'app sans session → bootstrap appelé au montage (bootstrapping=false)',
    useSessionStore.getState().bootstrapping === false,
  );
  check('app sans session → pas d’écran « Chargement… »', !container.innerHTML.includes('Chargement…'));

  // 2) Avec session stockée (actualisation) : refresh polyfillé → authenticated.
  localStorage.setItem(
    'pdftrain.bo.session',
    JSON.stringify({
      accessToken: 'old-token',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() + 3_600_000,
      user: { id: 'usr-m1', email: 'm@x.io', firstName: 'Mireille', lastName: 'Rakoto', role: 'MANAGER' },
    }),
  );
  (globalThis as unknown as { fetch: typeof fetch }).fetch = ((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/refresh')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            accessToken: 'new-token',
            refreshToken: 'new-refresh',
            expiresAt: Date.now() + 3_600_000,
            user: {
              id: 'usr-m1',
              email: 'm@x.io',
              firstName: 'Mireille',
              lastName: 'Rakoto',
              role: 'MANAGER',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
    if (url.includes('/admin/stats')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            users: 1,
            managers: 1,
            learners: 0,
            formations: 0,
            levels: 0,
            documents: 0,
            grants: 0,
            perFormation: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
  }) as typeof fetch;

  const container2 = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container2);
  createRoot(container2).render(<App />);
  await sleep(200);
  const state = useSessionStore.getState();
  check(
    'app avec session → refresh rejoué au montage (status authenticated)',
    state.status === 'authenticated',
  );
  check('app avec session → bootstrapping=false', state.bootstrapping === false);
  check(
    'app avec session → layout rendu, pas d’écran « Chargement… »',
    !container2.innerHTML.includes('Chargement…'),
  );

  process.exit(failed ? 1 : 0);
}

void main();
