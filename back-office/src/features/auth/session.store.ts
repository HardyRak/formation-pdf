import { create } from 'zustand';
import {
  api,
  configureHttpClient,
  isApiError,
  SESSION_KEY,
  toApiError,
  type StoredSession,
} from '@/shared/api/client';
import type { ApiError, AuthSessionDto, UserDto } from '@/shared/types/api';

interface SessionState {
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  bootstrapping: boolean;
  session: StoredSession | null;
  user: UserDto | null;
  error: ApiError | null;
  notice: string | null;
}

const initial: SessionState = {
  status: 'idle',
  bootstrapping: true,
  session: null,
  user: null,
  error: null,
  notice: null,
};

const isManager = (user: UserDto | null): boolean => user?.role === 'MANAGER';

export const useSessionStore = create<
  SessionState & {
    login: (email: string, password: string) => Promise<boolean>;
    logout: (notice?: string | null) => Promise<void>;
    bootstrap: () => Promise<void>;
    refresh: () => Promise<string | null>;
  }
>((set, get) => {
  async function persistSession(session: AuthSessionDto | null): Promise<void> {
    if (session) {
      const stored: StoredSession = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        user: session.user,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  async function refreshSession(): Promise<string | null> {
    const current = get().session;
    if (!current) return null;
    try {
      const session = await api.post<AuthSessionDto>(
        '/auth/refresh',
        { refreshToken: current.refreshToken },
        { anonymous: true },
      );
      await persistSession(session);
      set({
        session: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        },
        user: session.user,
      });
      return session.accessToken;
    } catch {
      await get().logout('Votre session a expiré. Merci de vous reconnecter.');
      return null;
    }
  }

  // Configure les intercepteurs du client HTTP.
  configureHttpClient({
    getAccessToken: () => get().session?.accessToken ?? null,
    onUnauthorized: async () => refreshSession(),
  });

  return {
    ...initial,

    async bootstrap(): Promise<void> {
      set({ bootstrapping: true });
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        set({ bootstrapping: false, status: 'idle' });
        return;
      }
      try {
        const session = JSON.parse(raw) as StoredSession;
        const userFromStorage = session.user as unknown;
        set({ session, user: (userFromStorage as UserDto) ?? null, status: 'authenticated' });
        // Récupère le profil frais + vérifie le rôle.
        const token = await refreshSession();
        // Succès : on débloque l'écran « Chargement… ».
        // (En cas d'échec, refreshSession() a appelé logout() qui le fait déjà.)
        if (token) set({ bootstrapping: false });
      } catch {
        await persistSession(null);
        set({ session: null, user: null, bootstrapping: false, status: 'idle' });
      }
    },

    async login(email: string, password: string): Promise<boolean> {
      set({ status: 'loading', error: null, notice: null });
      try {
        const session = await api.post<AuthSessionDto>(
          '/auth/login',
          { email: email.trim(), password },
          { anonymous: true },
        );
        // Le back-office est réservé aux responsables de formation.
        if (!isManager(session.user)) {
          set({
            status: 'error',
            error: {
              status: 403,
              code: 'FORBIDDEN',
              message: "Ce compte n'est pas autorisé sur le back-office.",
            },
            session: null,
            user: null,
          });
          await persistSession(null);
          return false;
        }
        await persistSession(session);
        set({
          status: 'authenticated',
          session: {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt,
          },
          user: session.user,
          error: null,
          notice: null,
          bootstrapping: false,
        });
        return true;
      } catch (error) {
        set({ status: 'error', error: toApiError(error), session: null, user: null });
        return false;
      }
    },

    async logout(notice: string | null = null): Promise<void> {
      try {
        if (get().session) await api.post('/auth/logout', undefined);
      } catch {
        /* déconnexion locale malgré erreur réseau */
      }
      await persistSession(null);
      set({ ...initial, status: 'idle', notice, bootstrapping: false });
    },

    async refresh(): Promise<string | null> {
      return refreshSession();
    },

    clearError: () => set({ error: null }),
    clearNotice: () => set({ notice: null }),
  };
});

export const useIsManager = (): boolean => {
  const user = useSessionStore((s) => s.user);
  return isManager(user);
};

export { isApiError };
