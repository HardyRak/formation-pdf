import type { AccessSummary, RequestStatus } from '../models';
import { authApi } from '../api/auth.api';
import { signalStore, useSignalStore } from './create-store';
import {
  hasFormationAccess as staticHasFormationAccess,
  hasLevelAccess as staticHasLevelAccess,
  getAccessibleFormations as staticGetAccessibleFormations,
} from '../security/access';

/**
 * Droits d'accès chargés depuis le backend (`GET /auth/me/access`).
 * Remplacent les règles codées en dur de `security/access.ts`, qui restent
 * utilisées comme fallback (mode mock, ou tant que le résumé n'est pas chargé).
 */
interface AccessState {
  status: RequestStatus;
  role: 'LEARNER' | 'MANAGER' | null;
  /** `null` = non chargé. `['*']` = accès complet (manager). */
  formations: string[] | null;
  /** Niveaux accessibles par formation (`[]` = tous les niveaux). */
  levels: Record<string, string[]>;
}

const initial: AccessState = {
  status: 'idle',
  role: null,
  formations: null,
  levels: {},
};

const store = signalStore<AccessState>('AccessStore', initial);

export const accessStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  async load(): Promise<void> {
    if (store.state().status === 'loading') return;
    store.patchState({ status: 'loading' });
    try {
      const data: AccessSummary = await authApi.meAccess();
      store.patchState({
        status: 'success',
        role: data.role,
        formations: data.formations,
        levels: data.levels,
      });
    } catch {
      // En cas d'échec, on retombe sur les règles statiques (fallback).
      store.patchState({ status: 'error', role: null, formations: null, levels: {} });
    }
  },

  reset: store.reset,
};

export const useAccessStore = () => useSignalStore(store);

const isManager = (state: AccessState) => state.formations?.includes('*') ?? false;

export function hasFormationAccess(userId: string | null | undefined, formationId: string): boolean {
  const state = store.state();
  if (state.formations) {
    return isManager(state) || state.formations.includes(formationId);
  }
  return staticHasFormationAccess(userId, formationId);
}

export function hasLevelAccess(
  userId: string | null | undefined,
  formationId: string,
  levelId: string,
): boolean {
  const state = store.state();
  if (state.formations) {
    if (isManager(state)) return true;
    if (!state.formations.includes(formationId)) return false;
    const allowed = state.levels[formationId];
    if (!allowed) return false;
    return allowed.length === 0 || allowed.includes(levelId);
  }
  return staticHasLevelAccess(userId, formationId, levelId);
}

export function getAccessibleFormations(userId: string | null | undefined): string[] {
  const state = store.state();
  if (state.formations) {
    return isManager(state) ? ['*'] : state.formations;
  }
  return staticGetAccessibleFormations(userId);
}
