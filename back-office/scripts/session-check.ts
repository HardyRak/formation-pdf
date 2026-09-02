/**
 * Vérifie le bootstrap de session (scénario « actualisation de la page ») :
 * `npm run test:session`. Simule localStorage + fetch côté node et pilote le
 * VRAI store (src/auth/session.store.ts).
 */
import { useSessionStore } from '../src/auth/session.store';

// --- Polyfills navigateur minimal (node) -------------------------------
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => void store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

let refreshStatus = 200;
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('/auth/refresh')) {
    if (refreshStatus !== 200) {
      return json({ status: 401, code: 'REFRESH_EXPIRED', message: 'Session expirée.' }, refreshStatus);
    }
    return json(
      {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 900_000,
        user: { id: 'usr-2', email: 'karim@x.io', role: 'MANAGER', firstName: 'Karim', lastName: 'Benali' },
      },
      200,
    );
  }
  if (url.includes('/auth/logout')) return json({}, 200);
  return json({}, 200);
}) as typeof fetch;

// --- Checks -------------------------------------------------------------
let failed = false;
function check(label: string, ok: boolean) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed = true;
}

const storedSession = JSON.stringify({
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  expiresAt: Date.now() - 1000,
  user: { id: 'usr-2', email: 'karim@x.io', role: 'MANAGER', firstName: 'Karim', lastName: 'Benali' },
});

async function main() {
  // 1) Aucune session stockée : bootstrap débloque immédiatement.
  store.clear();
  await useSessionStore.getState().bootstrap();
  check('sans session → bootstrapping=false', useSessionStore.getState().bootstrapping === false);
  check('sans session → status idle', useSessionStore.getState().status === 'idle');

  // 2) Session stockée + refresh OK (le cas du bug : actualisation connecté).
  store.set('pdftrain.bo.session', storedSession);
  refreshStatus = 200;
  await useSessionStore.getState().bootstrap();
  check('refresh OK → bootstrapping=false (bug « bloqué sur Chargement »)', useSessionStore.getState().bootstrapping === false);
  check('refresh OK → status authenticated', useSessionStore.getState().status === 'authenticated');
  check('refresh OK → jeton remplacé', useSessionStore.getState().session?.accessToken === 'new-access');

  // 3) Session stockée + refresh refusé : logout, débloqué, redirection login possible.
  store.set('pdftrain.bo.session', storedSession);
  refreshStatus = 401;
  await useSessionStore.getState().bootstrap();
  check('refresh refusé → bootstrapping=false', useSessionStore.getState().bootstrapping === false);
  check('refresh refusé → session effacée', useSessionStore.getState().session === null);
  check('refresh refusé → notice posée', (useSessionStore.getState().notice ?? '').length > 0);

  process.exit(failed ? 1 : 0);
}

void main();
