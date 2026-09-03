import type { ApiError, PdfPage, RequestStatus, TrainingDocument } from '../models';
import { Platform } from 'react-native';
import { documentApi } from '../api/document.api';
import { toApiError } from '../api/http-client';
import { READER_MAX_MEMORY_MB } from '../config/env';
import { looksLikePdf } from '../utils/binary';
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

  /** Charge le document + son flux authentifié, et calcule la page de reprise. */
  async open(documentId: string): Promise<void> {
    store.patchState({ ...initial, status: 'loading' });
    try {
      const [document, result] = await Promise.all([
        documentApi.byId(documentId),
        documentApi.stream(documentId),
      ]);

      if (result.kind === 'pdf') {
        // Mémoire bornée (natif uniquement) : octets + base64 coexistent au
        // rendu et aucun fichier n'est écrit sur l'appareil (promesse de
        // sécurité). Au-delà du seuil : erreur explicite, pas de crash OOM.
        if (Platform.OS !== 'web') {
          const maxBytes = READER_MAX_MEMORY_MB * 1024 * 1024;
          if (result.bytes.byteLength > maxBytes) {
            store.patchState({
              status: 'error',
              error: {
                status: 413,
                code: 'DOCUMENT_TOO_LARGE',
                message:
                  `Document trop volumineux (${Math.round(result.bytes.byteLength / (1024 * 1024))} Mo) : ` +
                  `la lecture sécurisée en mémoire est limitée à ${READER_MAX_MEMORY_MB} Mo sur cet appareil.`,
              },
            });
            return;
          }
        }

        // Contenu invalide (ex. JSON d'erreur servi en binaire) : état d'erreur
        // explicite plutôt qu'un renderer muet sur un document illisible.
        if (!looksLikePdf(result.bytes)) {
          store.patchState({
            status: 'error',
            error: {
              status: 422,
              code: 'INVALID_CONTENT',
              message: 'Contenu reçu invalide : le document n’est pas un PDF lisible.',
            },
          });
          return;
        }

        // Vrai fichier PDF : on conserve les octets et le nombre de pages réel.
        const pageCount = Math.max(1, result.pageCount || document.pageCount || 1);
        const resumePage = Math.max(1, Math.min(progressionStore.resumePage(documentId), pageCount));
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
        progressionStore.trackPage(document, resumePage, pageCount);
        return;
      }

      // Contenu structuré en blocs (ancien modèle).
      const pageCount = Math.max(1, result.pages.length);
      const resumePage = Math.max(1, Math.min(progressionStore.resumePage(documentId), pageCount));
      store.patchState({
        status: 'success',
        document,
        pages: result.pages,
        pdfBytes: null,
        pageCount,
        currentPage: resumePage,
        resumePage,
        error: null,
      });
      progressionStore.trackPage(document, resumePage, pageCount);
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
    progressionStore.trackPage(document, next, total);
  },

  /**
   * Nombre de pages réel rapporté par le renderer natif (`onLoadComplete` /
   * `onPageChanged`). La métadonnée d'upload peut diverger du fichier : le
   * renderer fait foi pour l'affichage, le clamp et la progression.
   */
  applyRealPageCount(count: number): void {
    const safe = Math.floor(count);
    if (!Number.isFinite(safe) || safe < 1) return;
    const s = store.state();
    if (safe === s.pageCount) return;
    store.patchState({ pageCount: safe });
    if (s.currentPage > safe) pdfReaderStore.setPage(safe);
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
