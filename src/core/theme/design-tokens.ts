/**
 * Design tokens pour l'application.
 * Centralise les constantes visuelles utilisées dans toute l'application.
 */

/**
 * Opacité des éléments interactifs selon leur état.
 */
export const OPACITY = {
  /** État pressé par défaut pour les cartes */
  cardPressed: 0.92,
  /** État pressé pour les boutons */
  buttonPressed: 0.88,
  /** État désactivé */
  disabled: 0.55,
  /** État pressé pour les icônes de navigation */
  iconPressed: 0.7,
  /** État pressé pour les éléments de liste */
  listItemPressed: 0.7,
  /** État pressé pour les actions */
  actionPressed: 0.85,
  /** État très désactivé (outils inactifs) */
  toolDisabled: 0.3,
  /** État pressé pour les outils */
  toolPressed: 0.6,
} as const;

/**
 * Échelle des éléments interactifs selon leur état.
 */
export const SCALE = {
  /** État pressé par défaut */
  pressed: 0.99,
  /** État pressé pour les boutons */
  buttonPressed: 0.985,
} as const;

/**
 * Valeurs alpha pour les couleurs avec transparence.
 * Utilisées pour créer des variantes de couleurs avec opacité.
 */
export const ALPHA = {
  /** Mode sombre - très transparent */
  darkVerySubtle: '0F',
  /** Mode sombre - subtil */
  darkSubtle: '18',
  /** Mode sombre - moyen */
  darkMedium: '2B',
  /** Mode sombre - visible */
  darkVisible: '44',
  /** Mode clair - très transparent */
  lightVerySubtle: '14',
  /** Mode clair - subtil */
  lightSubtle: '16',
  /** Mode clair - moyen */
  lightMedium: '1F',
  /** Mode clair - visible */
  lightVisible: '55',
} as const;
