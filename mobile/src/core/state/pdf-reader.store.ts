import type { ApiError, PdfPage, RequestStatus, TrainingDocument } from '../models';
import { documentApi } from '../api/document.api';
import { toApiError } from '../api/http-client';
import { signalStore, useSignalStore } from './create-store';
import { progressionStore } from './progression.store';

export const ZOOM_STEPS = [0.85, 1, 1.25, 1.5, 1.85, 2.25];

interface PdfReaderState {
  status: RequestStatus;
  document: TrainingDocument | null;
  pages: PdfPage[];
  currentPage: number;
  resumePage: number;
  zoomIndex: number;
  fullscreen: boolean;
  outlineVisible: boolean;
  error: ApiError | null;
}

const initial: PdfReaderState = {
  status: 'idle',
  document: null,
  pages: [],
  currentPage: 1,
  resumePage: 1,
  zoomIndex: 1,
  fullscreen: false,
  outlineVisible: false,
  error: null,
};

const store = signalStore<PdfReaderState>('PdfReaderStore', initial);

export const pdfReaderStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  /** Charge le document + son flux authentifié, et calcule la page de reprise. */
  async open(documentId: string): Promise<void> {
    store.patchState({ ...initial, status: 'loading' });
    try {
      const [document, stream] = await Promise.all([
        documentApi.byId(documentId),
        documentApi.stream(documentId),
      ]);
      const resumePage = Math.min(progressionStore.resumePage(documentId), stream.pages.length);
      store.patchState({
        status: 'success',
        document,
        pages: stream.pages,
        currentPage: resumePage,
        resumePage,
        error: null,
      });
      progressionStore.trackPage(document, resumePage);
    } catch (error) {
      store.patchState({ status: 'error', error: toApiError(error) });
    }
  },

  setPage(page: number): void {
    const { pages, document, currentPage } = store.state();
    if (!document || pages.length === 0) return;
    const next = Math.max(1, Math.min(page, pages.length));
    if (next === currentPage) return;
    store.patchState({ currentPage: next });
    progressionStore.trackPage(document, next);
  },

  zoomIn(): void {
    const { zoomIndex } = store.state();
    store.patchState({ zoomIndex: Math.min(zoomIndex + 1, ZOOM_STEPS.length - 1) });
  },

  zoomOut(): void {
    const { zoomIndex } = store.state();
    store.patchState({ zoomIndex: Math.max(zoomIndex - 1, 0) });
  },

  resetZoom(): void {
    store.patchState({ zoomIndex: 1 });
  },

  zoom: (): number => ZOOM_STEPS[store.state().zoomIndex],

  toggleFullscreen(): void {
    store.patchState({ fullscreen: !store.state().fullscreen, outlineVisible: false });
  },

  toggleOutline(): void {
    store.patchState({ outlineVisible: !store.state().outlineVisible });
  },

  close(): void {
    store.patchState({ ...initial });
  },
};

export const usePdfReaderStore = () => useSignalStore(store);
