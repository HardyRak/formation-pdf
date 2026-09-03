import type { ApiError, Formation, RequestStatus } from '../models';
import { formationApi } from '../api/formation.api';
import { toApiError } from '../api/http-client';
import { signalStore, useSignalStore } from './create-store';

interface FormationState {
  status: RequestStatus;
  refreshing: boolean;
  items: Formation[];
  query: string;
  error: ApiError | null;
  loadedAt: number | null;
}

const initial: FormationState = {
  status: 'idle',
  refreshing: false,
  items: [],
  query: '',
  error: null,
  loadedAt: null,
};

const store = signalStore<FormationState>('FormationStore', initial);

export const formationStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  async load(options: { refresh?: boolean } = {}): Promise<void> {
    const { status } = store.state();
    if (status === 'loading') return;
    store.patchState(options.refresh ? { refreshing: true, error: null } : { status: 'loading', error: null });
    try {
      const items = await formationApi.list();
      store.patchState({ status: 'success', refreshing: false, items, error: null, loadedAt: Date.now() });
    } catch (error) {
      store.patchState({ status: 'error', refreshing: false, error: toApiError(error) });
    }
  },

  setQuery(query: string): void {
    store.patchState({ query });
  },

  byId: (id: string): Formation | null => store.state().items.find((item) => item.id === id) ?? null,

  /** computed() : filtrage par nom, description ou catégorie. */
  filtered: (): Formation[] => {
    const { items, query } = store.state();
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.description, item.category].some((field) => field.toLowerCase().includes(q)),
    );
  },

  reset: store.reset,
};

export const useFormationStore = () => useSignalStore(store);
