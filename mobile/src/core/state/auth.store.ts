import type { ApiError, AuthSession, RequestStatus, User } from '../models';
import { authApi } from '../api/auth.api';
import { configureHttpInterceptor, isTokenExpired, toApiError } from '../api/http-client';
import { secureStorage } from '../storage/secure-storage';
import { signalStore, useSignalStore } from './create-store';
import { progressionStore } from './progression.store';
import { accessStore } from './access.store';

const SESSION_KEY = 'pdftrain.session';

interface AuthState {
  status: RequestStatus;
  bootstrapping: boolean;
  session: AuthSession | null;
  user: User | null;
  error: ApiError | null;
  /** Message affiché sur l'écran de login après expiration. */
  notice: string | null;
  lastEmail: string;
}

const initial: AuthState = {
  status: 'idle',
  bootstrapping: true,
  session: null,
  user: null,
  error: null,
  notice: null,
  lastEmail: '',
};

const store = signalStore<AuthState>('AuthStore', initial);

let refreshInFlight: Promise<string | null> | null = null;
let interceptorConfigured = false;

/**
 * Configure l'intercepteur HTTP pour gérer l'authentification.
 * Appelée explicitement lors du bootstrap pour éviter les effets de bord cachés.
 */
function configureInterceptor() {
  if (interceptorConfigured) return;
  
  configureHttpInterceptor({
    getAccessToken: () => store.state().session?.accessToken ?? null,
    onUnauthorized: async () => {
      if (!refreshInFlight) {
        refreshInFlight = refreshSession().finally(() => {
          refreshInFlight = null;
        });
      }
      return refreshInFlight;
    },
  });
  
  interceptorConfigured = true;
}

async function persist(session: AuthSession | null) {
  if (session) await secureStorage.set(SESSION_KEY, JSON.stringify(session));
  else await secureStorage.remove(SESSION_KEY);
}

async function refreshSession(): Promise<string | null> {
  const current = store.state().session;
  if (!current) return null;
  try {
    const session = await authApi.refresh(current.refreshToken);
    store.patchState({ session, user: session.user });
    await persist(session);
    return session.accessToken;
  } catch {
    await authStore.logout('Votre session a expiré. Merci de vous reconnecter.');
    return null;
  }
}

export const authStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  isAuthenticated: () => {
    const { session } = store.state();
    return !!session && !isTokenExpired(session.accessToken);
  },

  /** Restauration de session au démarrage (équivalent APP_INITIALIZER). */
  async bootstrap(): Promise<void> {
    configureInterceptor();
    store.patchState({ bootstrapping: true });
    const raw = await secureStorage.get(SESSION_KEY);
    if (!raw) {
      store.patchState({ bootstrapping: false });
      return;
    }
    try {
      const session = JSON.parse(raw) as AuthSession;
      store.patchState({ session, user: session.user, lastEmail: session.user.email });
      if (isTokenExpired(session.accessToken)) {
        const token = await refreshSession();
        if (!token) {
          store.patchState({ bootstrapping: false });
          return;
        }
      }
      await progressionStore.hydrate(session.user.id);
      await accessStore.load();
      store.patchState({ status: 'success', bootstrapping: false });
    } catch {
      await persist(null);
      store.patchState({ session: null, user: null, bootstrapping: false });
    }
  },

  async login(email: string, password: string): Promise<boolean> {
    store.patchState({ status: 'loading', error: null, notice: null });
    try {
      const session = await authApi.login(email.trim(), password);
      await persist(session);
      store.patchState({
        status: 'success',
        session,
        user: session.user,
        error: null,
        lastEmail: session.user.email,
      });
      await progressionStore.hydrate(session.user.id);
      await accessStore.load();
      return true;
    } catch (error) {
      store.patchState({ status: 'error', error: toApiError(error), session: null, user: null });
      return false;
    }
  },

  async logout(notice: string | null = null): Promise<void> {
    const hadSession = !!store.state().session;
    if (hadSession) {
      try {
        await authApi.logout();
      } catch {
        /* déconnexion locale malgré l'erreur réseau */
      }
    }
    await persist(null);
    // Dernier push de la progression en attente (3 s max), puis purge locale.
    await progressionStore.detach();
    accessStore.reset();
    store.patchState({
      status: 'idle',
      session: null,
      user: null,
      error: null,
      notice,
      bootstrapping: false,
    });
  },

  clearError() {
    store.patchState({ error: null });
  },

  /** Outil de démonstration : force l'expiration du jeton d'accès. */
  async simulateExpiredSession(): Promise<void> {
    const { session } = store.state();
    if (!session) return;
    const expired: AuthSession = { ...session, accessToken: 'expired.token.signature', expiresAt: Date.now() - 1 };
    store.patchState({ session: expired });
    await persist(expired);
  },
};

export const useAuthStore = () => useSignalStore(store);
