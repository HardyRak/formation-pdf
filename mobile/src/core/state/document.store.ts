import type { ApiError, RequestStatus, TrainingDocument } from '../models';
import { documentApi } from '../api/document.api';
import { toApiError } from '../api/http-client';
import { signalStore, useSignalStore } from './create-store';

interface DocumentState {
  status: RequestStatus;
  refreshing: boolean;
  levelId: string | null;
  items: TrainingDocument[];
  error: ApiError | null;
}

const initial: DocumentState = {
  status: 'idle',
  refreshing: false,
  levelId: null,
  items: [],
  error: null,
};

const store = signalStore<DocumentState>('DocumentStore', initial);

export const documentStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  async load(levelId: string, options: { refresh?: boolean } = {}): Promise<void> {
    store.patchState(
      options.refresh
        ? { refreshing: true, error: null, levelId }
        : { status: 'loading', error: null, levelId, items: [] },
    );
    try {
      const items = await documentApi.listByLevel(levelId);
      store.patchState({ status: 'success', refreshing: false, items, error: null });
    } catch (error) {
      store.patchState({ status: 'error', refreshing: false, error: toApiError(error) });
    }
  },

  byId: (id: string): TrainingDocument | null => store.state().items.find((item) => item.id === id) ?? null,

  ordered: (): TrainingDocument[] => [...store.state().items].sort((a, b) => a.order - b.order),

  reset: store.reset,
};

export const useDocumentStore = () => useSignalStore(store);
