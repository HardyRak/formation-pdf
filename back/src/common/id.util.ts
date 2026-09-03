/**
 * Utilitaires de génération et de nettoyage d'identifiants métier.
 *
 * Partagés entre le module `admin` (création de formations / niveaux /
 * documents / catégories) et le module `seed` (référentiel initial) afin de
 * garantir que les identifiants produits sont cohérents d'un bout à l'autre
 * de l'application.
 */

/**
 * Slugifie une valeur pour générer un identifiant métier lisible
 * (ex. `'Hygiène & Sécurité'` → `'hygiene-securite'`).
 */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Échappe les caractères spéciaux d'une expression régulière, afin d'utiliser
 * un nom utilisateur comme terme littéral dans un `$regex` (anti-injection).
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Identifiant court aléatoire (suffixe) pour éviter toute collision de clé
 * lors de créations parallèles (le `count + 1` ne le garantit pas).
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
