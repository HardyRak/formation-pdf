import type { ApiError, Level, RequestStatus } from '../models';
import { formationApi } from '../api/formation.api';
import { toApiError } from '../api/http-client';
import { signalStore, useSignalStore } from './create-store';

interface LevelState {
  status: RequestStatus;
  refreshing: boolean;
  formationId: string | null;
  items: Level[];
  selectedId: string | null;
  error: ApiError | null;
}

const initial: LevelState = {
  status: 'idle',
  refreshing: false,
  formationId: null,
  items: [],
  selectedId: null,
  error: null,
};

const store = signalStore<LevelState>('LevelStore', initial);

export const levelStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  async load(formationId: string, options: { refresh?: boolean } = {}): Promise<void> {
    store.patchState(
      options.refresh
        ? { refreshing: true, error: null, formationId }
        : { status: 'loading', error: null, formationId, items: [] },
    );
    try {
      const items = await formationApi.levels(formationId);
      store.patchState({ status: 'success', refreshing: false, items, error: null });
    } catch (error) {
      store.patchState({ status: 'error', refreshing: false, error: toApiError(error) });
    }
  },

  select(levelId: string | null): void {
    store.patchState({ selectedId: levelId });
  },

  byId: (id: string): Level | null => store.state().items.find((item) => item.id === id) ?? null,

  ordered: (): Level[] => [...store.state().items].sort((a, b) => a.order - b.order),

  reset: store.reset,
};

export const useLevelStore = () => useSignalStore(store);
