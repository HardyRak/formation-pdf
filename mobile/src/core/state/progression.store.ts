import type { DocumentProgress, TrainingDocument } from '../models';
import { progressionApi } from '../api/progression.api';
import { toApiError } from '../api/http-client';
import { appStorage } from '../storage/secure-storage';
import { mergeProgressEntries, percentOf } from '../utils/progression-merge';
import { signalStore, useSignalStore } from './create-store';

/**
 * Store de progression — OFFLINE-FIRST avec synchronisation serveur.
 *
 * 1. Chaque page lue est enregistrée immédiatement en local
 *    (AsyncStorage, cf. `schedulePersist`) : la lecture ne dépend pas du réseau.
 * 2. Les modifications sont empilées dans une file d'attente (`pending`)
 *    puis poussées vers la base MongoDB (back/, collection `document_progress`)
 *    avec un léger debounce. En cas d'échec réseau, la file est conservée
 *    (même après redémarrage) et rejouée automatiquement.
 * 3. À la connexion / au démarrage (`hydrate`), la progression distante est
 *    fusionnée (union des pages, « last write wins » sur la position) : la
 *    progression suit l'utilisateur sur tous ses appareils.
 */

interface ProgressionState {
  userId: string | null;
  hydrated: boolean;
  documents: Record<string, DocumentProgress>;
  currentDocumentId: string | null;
  savingAt: number | null;
  // ---- synchronisation serveur ------------------------------------
  /** File d'attente des opérations à pousser (mode hors ligne). */
  pending: PendingOp[];
  /** `syncing` pendant un envoi, `error` si la dernière tentative a échoué. */
  syncStatus: 'idle' | 'syncing' | 'error';
  /** Message de la dernière erreur de synchronisation (null si OK). */
  syncError: string | null;
  /** Dernière synchronisation complète réussie (timestamp ms). */
  lastSyncAt: number | null;
}

type PendingOp =
  | { kind: 'upsert'; documentId: string }
  | { kind: 'reset'; documentId: string }
  | { kind: 'resetAll' };

interface LocalSnapshot {
  documents: Record<string, DocumentProgress>;
  currentDocumentId: string | null;
  pending: PendingOp[];
  updatedAt: number;
}

const initial: ProgressionState = {
  userId: null,
  hydrated: false,
  documents: {},
  currentDocumentId: null,
  savingAt: null,
  pending: [],
  syncStatus: 'idle',
  syncError: null,
  lastSyncAt: null,
};

const store = signalStore<ProgressionState>('ProgressionStore', initial);

const storageKey = (userId: string) => `pdftrain.progression.${userId}`;

// ---- Timers (écriture locale + envoi serveur + retry) ---------------
const PERSIST_DEBOUNCE_MS = 300;
const SYNC_DEBOUNCE_MS = 900;
/** Backoff des tentatives en cas d'indisponibilité du serveur. */
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let flushInFlight: Promise<boolean> | null = null;

function clearTimers() {
  if (writeTimer) clearTimeout(writeTimer);
  if (syncTimer) clearTimeout(syncTimer);
  if (retryTimer) clearTimeout(retryTimer);
  writeTimer = syncTimer = retryTimer = null;
}

// ---- Persistance locale (offline) ------------------------------------

function schedulePersist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    const { userId, documents, currentDocumentId, pending } = store.state();
    if (!userId) return;
    await appStorage.setJSON(storageKey(userId), {
      documents,
      currentDocumentId,
      pending,
      updatedAt: Date.now(),
    } satisfies LocalSnapshot);
    store.patchState({ savingAt: Date.now() });
  }, PERSIST_DEBOUNCE_MS);
}

// ---- File d'attente de synchronisation -------------------------------

function enqueueUpsert(documentId: string) {
  const pending = store.state().pending;
  // Un upsert en attente pour le même document est remplacé (idempotent) ;
  // un éventuel reset antérieur est conservé pour préserver l'ordre.
  const index = pending.findIndex((op) => op.kind === 'upsert' && op.documentId === documentId);
  if (index >= 0) {
    const next = pending.slice();
    next[index] = { kind: 'upsert', documentId };
    store.patchState({ pending: next });
  } else {
    store.patchState({ pending: [...pending, { kind: 'upsert', documentId }] });
  }
  scheduleSync();
}

function enqueueResetDocument(documentId: string) {
  const next = store
    .state()
    .pending.filter((op) => !('documentId' in op && op.documentId === documentId));
  next.push({ kind: 'reset', documentId });
  store.patchState({ pending: next });
  scheduleSync();
}

function enqueueResetAll() {
  store.patchState({ pending: [{ kind: 'resetAll' }] });
  scheduleSync();
}

/** Pousse la file d'attente après un court debounce (regroupe les pages). */
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void flushPending(), SYNC_DEBOUNCE_MS);
}

/** Replanifie un envoi après échec (backoff croissant). */
function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  retryTimer = setTimeout(() => void flushPending(), delay);
}

/**
 * Vidée la file d'attente, opération par opération, dans l'ordre.
 * Retourne true si la file est vide à la fin. Single-flight : les appels
 * concurrents partagent la même exécution.
 */
function flushPending(): Promise<boolean> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = runFlush().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function runFlush(): Promise<boolean> {
  if (retryTimer) clearTimeout(retryTimer);

  let queue = store.state().pending;
  if (queue.length === 0 || !store.state().userId) return queue.length === 0;

  store.patchState({ syncStatus: 'syncing', syncError: null });

  while (queue.length > 0) {
    const op = queue[0];
    try {
      if (op.kind === 'upsert') {
        const entry = store.state().documents[op.documentId];
        // L'entrée a disparu localement (reset concurrent) : rien à pousser.
        if (entry) await progressionApi.upsert(op.documentId, entry);
      } else if (op.kind === 'reset') {
        await progressionApi.resetDocument(op.documentId);
      } else {
        await progressionApi.resetAll();
      }
      queue = queue.slice(1);
      store.patchState({ pending: queue });
    } catch (error) {
      const apiErr = toApiError(error);
      store.patchState({ syncStatus: 'error', syncError: apiErr.message, pending: queue });
      scheduleRetry();
      return false;
    }
  }

  store.patchState({ syncStatus: 'idle', syncError: null, lastSyncAt: Date.now() });
  retryAttempt = 0;
  return true;
}

/**
 * Réalignement complet avec le serveur : push de la file d'attente puis
 * fusion de la progression distante (les deux côtés appliquent la même
 * fusion convergente — cf. `mergeProgressEntries`).
 */
async function syncWithServer(): Promise<void> {
  const userId = store.state().userId;
  if (!userId) return;

  const pushed = await flushPending();

  try {
    const remote = await progressionApi.list();
    const current = store.state();
    if (current.userId !== userId) return; // la session a changé entre-temps

    let documents = current.documents;
    let changed = false;
    for (const entry of remote) {
      const local = documents[entry.documentId];
      const merged = local ? mergeProgressEntries(local, entry) : entry;
      if (merged !== local) {
        documents = { ...documents, [entry.documentId]: merged };
        changed = true;
      }
    }
    if (changed) {
      store.patchState({ documents });
      schedulePersist();
    }

    if (store.state().pending.length === 0) {
      store.patchState({ syncStatus: 'idle', syncError: null, lastSyncAt: Date.now() });
    } else if (pushed) {
      // De nouvelles opérations sont arrivées pendant la fusion : on repousse.
      void flushPending();
    }
  } catch (error) {
    store.patchState({ syncStatus: 'error', syncError: toApiError(error).message });
    scheduleRetry();
  }
}

// ----------------------------------------------------------------------

export const progressionStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  /**
   * Chargement local immédiat, puis synchronisation serveur en arrière-plan
   * (ne bloque jamais l'affichage : le réseau n'est pas requis pour lire).
   */
  async hydrate(userId: string): Promise<void> {
    const saved = await appStorage.getJSON<LocalSnapshot>(storageKey(userId));
    store.patchState({
      userId,
      hydrated: true,
      documents: saved?.documents ?? {},
      currentDocumentId: saved?.currentDocumentId ?? null,
      pending: saved?.pending ?? [],
      syncStatus: 'idle',
      syncError: null,
    });
    void syncWithServer();
  },

  /** Force une synchronisation immédiate (pull-to-refresh, diagnostic…). */
  async syncNow(): Promise<void> {
    if (!store.state().userId) return;
    await syncWithServer();
  },

  /** Déconnexion : dernière tentative d'envoi (3 s max), puis purge. */
  async detach(): Promise<void> {
    const hadPending = store.state().pending.length > 0 && !!store.state().userId;
    clearTimers();
    if (hadPending) {
      const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), 3_000));
      await Promise.race([flushPending(), timeout]).catch(() => undefined);
    }
    retryAttempt = 0;
    store.patchState({ ...initial });
  },

  /** Enregistre la page consultée et met à jour tous les niveaux d'agrégation. */
  trackPage(doc: TrainingDocument, page: number): void {
    const safePage = Math.max(1, Math.min(page || 1, Math.max(1, doc.pageCount || 1)));
    const pageCount = Math.max(1, doc.pageCount || 1);
    const state = store.state();
    const existing = state.documents[doc.id];
    const pagesRead = new Set((existing?.pagesRead ?? []).filter((p) => p >= 1));
    pagesRead.add(safePage);
    const readCount = pagesRead.size;
    const entry: DocumentProgress = {
      documentId: doc.id,
      levelId: doc.levelId,
      formationId: doc.formationId,
      lastPage: safePage,
      pageCount,
      pagesRead: Array.from(pagesRead).sort((a, b) => a - b),
      percent: percentOf(readCount, pageCount),
      completed: readCount >= pageCount,
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
    enqueueUpsert(doc.id);
  },

  /** Efface la progression d'un document, en local ET sur le serveur. */
  resetDocument(documentId: string): void {
    const documents = { ...store.state().documents };
    delete documents[documentId];
    store.patchState({ documents });
    schedulePersist();
    enqueueResetDocument(documentId);
  },

  /** Efface toute la progression, en local ET sur le serveur. */
  resetAll(): void {
    store.patchState({ documents: {}, currentDocumentId: null });
    schedulePersist();
    enqueueResetAll();
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
