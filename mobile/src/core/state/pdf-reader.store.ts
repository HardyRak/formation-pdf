import type { ApiError, PdfPage, RequestStatus, TrainingDocument } from '../models';
import { documentApi } from '../api/document.api';
import { toApiError } from '../api/http-client';
import { signalStore, useSignalStore } from './create-store';
import { progressionStore } from './progression.store';

export const ZOOM_STEPS = [0.85, 1, 1.25, 1.5, 1.85, 2.25];

interface PdfReaderState {
  status: RequestStatus;
  document: TrainingDocument | null;
  /** Pages structurées (mode « blocs »). Vide en mode « vrai PDF ». */
  pages: PdfPage[];
  /** Octets du vrai PDF (mode « vrai PDF »). `null` en mode « blocs ». */
  pdfBytes: Uint8Array | null;
  /** Nombre de pages réel (métadonnées du document). */
  pageCount: number;
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
  pdfBytes: null,
  pageCount: 0,
  currentPage: 1,
  resumePage: 1,
  zoomIndex: 1,
  fullscreen: false,
  outlineVisible: false,
  error: null,
};

const store = signalStore<PdfReaderState>('PdfReaderStore', initial);

/** Nombre total de pages (pdf ou blocs). */
const totalPages = (s: PdfReaderState): number =>
  s.pdfBytes ? s.pageCount : s.pages.length;

export const pdfReaderStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  /** Type de contenu du document chargé. */
  isPdf: (): boolean => {
    const s = store.state();
    return s.pdfBytes !== null && s.pdfBytes.length > 0;
  },

  /** Charge le document + son flux authentifié, et calcule la page de reprise. */
  async open(documentId: string): Promise<void> {
    store.patchState({ ...initial, status: 'loading' });
    try {
      const [document, result] = await Promise.all([
        documentApi.byId(documentId),
        documentApi.stream(documentId),
      ]);

      if (result.kind === 'pdf') {
        // Vrai fichier PDF : on conserve les octets et le nombre de pages réel.
        const pageCount = Math.max(1, result.pageCount || document.pageCount);
        const resumePage = Math.min(progressionStore.resumePage(documentId), pageCount);
        store.patchState({
          status: 'success',
          document,
          pages: [],
          pdfBytes: result.bytes,
          pageCount,
          currentPage: resumePage,
          resumePage,
          error: null,
        });
        progressionStore.trackPage(document, resumePage);
        return;
      }

      // Contenu structuré en blocs (ancien modèle).
      const resumePage = Math.min(progressionStore.resumePage(documentId), result.pages.length);
      store.patchState({
        status: 'success',
        document,
        pages: result.pages,
        pdfBytes: null,
        pageCount: result.pages.length,
        currentPage: resumePage,
        resumePage,
        error: null,
      });
      progressionStore.trackPage(document, resumePage);
    } catch (error) {
      store.patchState({ status: 'error', error: toApiError(error) });
    }
  },

  /** Page courante (mode PDF ou blocs). */
  setPage(page: number): void {
    const s = store.state();
    const { document, currentPage } = s;
    if (!document) return;
    const total = totalPages(s);
    if (total === 0) return;
    const next = Math.max(1, Math.min(page, total));
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
