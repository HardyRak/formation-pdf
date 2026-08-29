import type { DocumentProgress, TrainingDocument } from '../models';
import { appStorage } from '../storage/secure-storage';
import { signalStore, useSignalStore } from './create-store';

interface ProgressionState {
  userId: string | null;
  hydrated: boolean;
  documents: Record<string, DocumentProgress>;
  currentDocumentId: string | null;
  savingAt: number | null;
}

const initial: ProgressionState = {
  userId: null,
  hydrated: false,
  documents: {},
  currentDocumentId: null,
  savingAt: null,
};

const store = signalStore<ProgressionState>('ProgressionStore', initial);

const storageKey = (userId: string) => `pdftrain.progression.${userId}`;

let writeTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    const { userId, documents, currentDocumentId } = store.state();
    if (!userId) return;
    await appStorage.setJSON(storageKey(userId), { documents, currentDocumentId, updatedAt: Date.now() });
    store.patchState({ savingAt: Date.now() });
  }, 300);
}

const percentOf = (pagesRead: number, pageCount: number) =>
  pageCount > 0 ? Math.min(100, Math.round((pagesRead / pageCount) * 100)) : 0;

export const progressionStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  async hydrate(userId: string): Promise<void> {
    const saved = await appStorage.getJSON<{
      documents: Record<string, DocumentProgress>;
      currentDocumentId: string | null;
    }>(storageKey(userId));
    store.patchState({
      userId,
      hydrated: true,
      documents: saved?.documents ?? {},
      currentDocumentId: saved?.currentDocumentId ?? null,
    });
  },

  detach(): void {
    store.patchState({ ...initial });
  },

  /** Enregistre la page consultée et met à jour tous les niveaux d'agrégation. */
  trackPage(doc: TrainingDocument, page: number): void {
    const state = store.state();
    const existing = state.documents[doc.id];
    const pagesRead = new Set(existing?.pagesRead ?? []);
    pagesRead.add(page);
    const readCount = pagesRead.size;
    const entry: DocumentProgress = {
      documentId: doc.id,
      levelId: doc.levelId,
      formationId: doc.formationId,
      lastPage: page,
      pageCount: doc.pageCount,
      pagesRead: Array.from(pagesRead).sort((a, b) => a - b),
      percent: percentOf(readCount, doc.pageCount),
      completed: readCount >= doc.pageCount,
      updatedAt: Date.now(),
    };
    if (
      existing &&
      existing.lastPage === entry.lastPage &&
      existing.pagesRead.length === entry.pagesRead.length &&
      state.currentDocumentId === doc.id
    ) {
      return;
    }
    store.patchState({
      documents: { ...state.documents, [doc.id]: entry },
      currentDocumentId: doc.id,
    });
    schedulePersist();
  },

  resetDocument(documentId: string): void {
    const documents = { ...store.state().documents };
    delete documents[documentId];
    store.patchState({ documents });
    schedulePersist();
  },

  resetAll(): void {
    store.patchState({ documents: {}, currentDocumentId: null });
    schedulePersist();
  },

  // ---- sélecteurs dérivés (computed) ----------------------------
  documentProgress: (documentId: string): DocumentProgress | null =>
    store.state().documents[documentId] ?? null,

  resumePage: (documentId: string): number => store.state().documents[documentId]?.lastPage ?? 1,

  pagesReadIn: (predicate: (entry: DocumentProgress) => boolean): number =>
    Object.values(store.state().documents)
      .filter(predicate)
      .reduce((total, entry) => total + entry.pagesRead.length, 0),

  levelPercent: (levelId: string, totalPages: number): number =>
    percentOf(
      progressionStore.pagesReadIn((entry) => entry.levelId === levelId),
      totalPages,
    ),

  formationPercent: (formationId: string, totalPages: number): number =>
    percentOf(
      progressionStore.pagesReadIn((entry) => entry.formationId === formationId),
      totalPages,
    ),

  completedDocuments: (): DocumentProgress[] =>
    Object.values(store.state().documents).filter((entry) => entry.completed),

  recentDocuments: (limit = 5): DocumentProgress[] =>
    Object.values(store.state().documents)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit),
};

export const useProgressionStore = () => useSignalStore(store);
export const progressionPercent = percentOf;
