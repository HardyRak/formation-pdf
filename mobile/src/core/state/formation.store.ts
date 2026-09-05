import type { ApiError, Formation, FormationCategory, RequestStatus } from '../models';
import { formationApi } from '../api/formation.api';
import { toApiError } from '../api/http-client';
import { signalStore, useSignalStore } from './create-store';

/** Taille d'une tranche chargée par l'infinite scroll. */
export const FORMATION_PAGE_SIZE = 10;

/** Délai d'anti-rebond de la recherche serveur (ms). */
const SEARCH_DEBOUNCE_MS = 350;

/** Taille des tranches utilisées pour agréger le catalogue complet. */
const CATALOG_CHUNK_SIZE = 50;

interface FormationState {
  /** Statut du premier chargement (ou d'un rechargement complet). */
  status: RequestStatus;
  refreshing: boolean;
  /** Chargement de la page suivante (infinite scroll). */
  loadingMore: boolean;
  items: Formation[];
  /** Terme de recherche saisi ; le filtrage est fait par le backend. */
  query: string;
  /** Catégorie sélectionnée (`null` = toutes). */
  category: string | null;
  categories: FormationCategory[];
  page: number;
  total: number;
  hasMore: boolean;
  error: ApiError | null;
  /** Erreur survenue en chargeant une page suivante (n'écrase pas la liste). */
  loadMoreError: ApiError | null;
  loadedAt: number | null;
  /**
   * Catalogue complet, agrégé par tranches successives et indépendant des
   * filtres de navigation. Alimente les écrans de synthèse (progression,
   * profil) qui raisonnent sur l'ensemble des formations.
   */
  catalog: Formation[];
  catalogStatus: RequestStatus;
}

const initial: FormationState = {
  status: 'idle',
  refreshing: false,
  loadingMore: false,
  items: [],
  query: '',
  category: null,
  categories: [],
  page: 0,
  total: 0,
  hasMore: false,
  error: null,
  loadMoreError: null,
  loadedAt: null,
  catalog: [],
  catalogStatus: 'idle',
};

const store = signalStore<FormationState>('FormationStore', initial);

/**
 * Jeton de requête : seule la réponse de la dernière recherche/filtre lancée
 * est appliquée, ce qui évite qu'une réponse lente écrase un résultat récent.
 */
let requestToken = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function cancelPendingSearch(): void {
  if (searchTimer !== null) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
}

/** Charge la première page pour la recherche / catégorie courante. */
async function loadFirstPage(options: { refresh?: boolean } = {}): Promise<void> {
  const { query, category } = store.state();
  const token = ++requestToken;

  store.patchState(
    options.refresh
      ? { refreshing: true, error: null, loadMoreError: null }
      : { status: 'loading', error: null, loadMoreError: null },
  );

  try {
    const result = await formationApi.list({
      page: 1,
      limit: FORMATION_PAGE_SIZE,
      q: query,
      category: category ?? undefined,
    });
    if (token !== requestToken) return;
    store.patchState({
      status: 'success',
      refreshing: false,
      loadingMore: false,
      items: result.items,
      page: result.page,
      total: result.total,
      hasMore: result.hasMore,
      error: null,
      loadedAt: Date.now(),
    });
  } catch (error) {
    if (token !== requestToken) return;
    store.patchState({ status: 'error', refreshing: false, error: toApiError(error) });
  }
}

/** Agrège le catalogue complet par tranches (jamais en un seul appel). */
async function fetchWholeCatalog(): Promise<Formation[]> {
  const all: Formation[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await formationApi.list({ page, limit: CATALOG_CHUNK_SIZE });
    all.push(...result.items);
    hasMore = result.hasMore;
    page += 1;
  }
  return all;
}

export const formationStore = {
  name: store.name,
  state: store.state,
  subscribe: store.subscribe,

  /** Premier chargement (ou pull-to-refresh) : liste + référentiel catégories. */
  async load(options: { refresh?: boolean } = {}): Promise<void> {
    cancelPendingSearch();
    await Promise.all([loadFirstPage(options), formationStore.loadCategories()]);
  },

  /** Tranche suivante de l'infinite scroll. */
  async loadMore(): Promise<void> {
    const { status, hasMore, loadingMore, refreshing, page, query, category } = store.state();
    if (!hasMore || loadingMore || refreshing || status !== 'success') return;

    const token = requestToken;
    store.patchState({ loadingMore: true, loadMoreError: null });

    try {
      const result = await formationApi.list({
        page: page + 1,
        limit: FORMATION_PAGE_SIZE,
        q: query,
        category: category ?? undefined,
      });
      if (token !== requestToken) return;
      const known = new Set(store.state().items.map((item) => item.id));
      const appended = result.items.filter((item) => !known.has(item.id));
      store.patchState((current) => ({
        items: [...current.items, ...appended],
        page: result.page,
        total: result.total,
        hasMore: result.hasMore,
        loadingMore: false,
      }));
    } catch (error) {
      if (token !== requestToken) return;
      store.patchState({ loadingMore: false, loadMoreError: toApiError(error) });
    }
  },

  /** Référentiel des catégories (filtre). Silencieux : non bloquant pour la liste. */
  async loadCategories(): Promise<void> {
    try {
      const categories = await formationApi.categories();
      store.patchState({ categories });
    } catch {
      // Le filtre est un confort : son indisponibilité ne bloque pas la liste.
    }
  },

  /** Saisie de recherche : relance une recherche serveur après anti-rebond. */
  setQuery(query: string): void {
    if (store.state().query === query) return;
    store.patchState({ query });
    cancelPendingSearch();
    searchTimer = setTimeout(() => {
      searchTimer = null;
      void loadFirstPage();
    }, SEARCH_DEBOUNCE_MS);
  },

  /** Sélection d'une catégorie (`null` = toutes) : rechargement immédiat. */
  setCategory(category: string | null): void {
    if (store.state().category === category) return;
    cancelPendingSearch();
    store.patchState({ category });
    void loadFirstPage();
  },

  /**
   * Charge le catalogue complet (par tranches) pour les écrans de synthèse.
   * Ne recharge pas si les données sont déjà présentes, sauf `refresh`.
   */
  async loadCatalog(options: { refresh?: boolean } = {}): Promise<void> {
    const { catalogStatus } = store.state();
    if (catalogStatus === 'loading') return;
    if (catalogStatus === 'success' && !options.refresh) return;

    store.patchState({ catalogStatus: 'loading' });
    try {
      const catalog = await fetchWholeCatalog();
      store.patchState({ catalog, catalogStatus: 'success' });
    } catch {
      store.patchState({ catalogStatus: 'error' });
    }
  },

  byId: (id: string): Formation | null => {
    const { items, catalog } = store.state();
    return items.find((item) => item.id === id) ?? catalog.find((item) => item.id === id) ?? null;
  },

  reset(): void {
    cancelPendingSearch();
    requestToken += 1;
    store.reset();
  },
};

export const useFormationStore = () => useSignalStore(store);
