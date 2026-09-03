import { useSyncExternalStore } from 'react';

/**
 * Micro implémentation de « SignalStore » :
 *  - un état immuable exposé comme signal (snapshot stable),
 *  - patchState() pour les mutations,
 *  - select() pour des sélecteurs dérivés (computed),
 *  - subscribe() pour l'intégration UI via useSyncExternalStore.
 */
export interface SignalStore<S extends object> {
  name: string;
  state: () => S;
  patchState: (patch: Partial<S> | ((current: S) => Partial<S>)) => void;
  subscribe: (listener: () => void) => () => void;
  reset: () => void;
}

export function signalStore<S extends object>(name: string, initialState: S): SignalStore<S> {
  let state = initialState;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());

  return {
    name,
    state: () => state,
    patchState(patch) {
      const partial = typeof patch === 'function' ? patch(state) : patch;
      let changed = false;
      for (const key of Object.keys(partial) as (keyof S)[]) {
        if (!Object.is(state[key], partial[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...partial };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      state = initialState;
      emit();
    },
  };
}

/** Hook « signal » : rend le composant à chaque changement d'état du store. */
export function useSignalStore<S extends object>(store: SignalStore<S>): S {
  return useSyncExternalStore(store.subscribe, store.state, store.state);
}
