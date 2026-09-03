/**
 * Configuration d'environnement du client.
 * Les variables `EXPO_PUBLIC_*` sont injectées à la compilation par Expo CLI
 * et peuvent être définies dans le fichier `.env` (voir `.env.example`).
 */

export type ApiMode = 'mock' | 'remote';

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

/** URL de base de l'API (préfixe /v1 inclus), sans slash final. */
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

/**
 * Mode de transport du client HTTP :
 *  - `remote` : requêtes HTTP réelles vers l'API NestJS (par défaut)
 *  - `mock`   : backend simulé embarqué (`src/core/api/backend`)
 */
export const API_MODE: ApiMode =
  process.env.EXPO_PUBLIC_API_MODE === 'mock' ? 'mock' : 'remote';

/**
 * Taille maximale (Mo) d'un PDF conservé en mémoire par le lecteur **natif**.
 *
 * Le renderer natif détient octets + base64 simultanément et la promesse de
 * sécurité est « aucun fichier stocké sur l'appareil » : au-delà du seuil,
 * ouverture refusée avec un état d'erreur explicite (DOCUMENT_TOO_LARGE)
 * plutôt qu'un risque OOM sur les appareils milieu de gamme. Sans effet sur
 * web (Blob URL, pas de base64).
 */
const rawReaderMaxMemoryMb = parseInt(process.env.EXPO_PUBLIC_READER_MAX_MEMORY_MB ?? '30', 10);
export const READER_MAX_MEMORY_MB =
  Number.isFinite(rawReaderMaxMemoryMb) && rawReaderMaxMemoryMb > 0 ? rawReaderMaxMemoryMb : 30;
