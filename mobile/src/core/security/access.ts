/**
 * Module de sécurité des informations - Contrôle d'accès aux formations et niveaux
 * Toutes les formations existent et sont retournées par le backend,
 * mais l'accès est filtré côté client selon le profil utilisateur.
 */

export type UserId = string;
export type FormationId = string;
export type LevelId = string;

/**
 * Mapping des accès aux formations par utilisateur
 * - usr-1 (Sophie Martin, LEARNER) : accès limité (2/4 formations) pour démontrer le verrouillage
 * - usr-2 (Karim Benali, MANAGER) : accès complet
 */
export const FORMATION_ACCESS: Record<UserId, FormationId[]> = {
  // Apprenant : accès aux formations obligatoires uniquement + 1 optionnelle
  'usr-1': ['f-hse', 'f-cyber', 'f-angular'], // 3 sur 4, f-manag verrouillée
  // Manager : accès complet
  'usr-2': ['f-angular', 'f-hse', 'f-cyber', 'f-manag'],
};

/**
 * Mapping des accès aux niveaux par utilisateur et par formation
 * Si une formation est verrouillée, tous ses niveaux sont verrouillés
 * Si une formation est accessible, certains niveaux peuvent être verrouillés
 */
const LEVEL_ACCESS: Record<UserId, Record<FormationId, LevelId[]>> = {
  'usr-1': {
    // HSE : accès complet
    'f-hse': ['l-hse-1', 'l-hse-2', 'l-hse-3'],
    // Cyber : seulement niveau 1
    'f-cyber': ['l-cyb-1'],
    // Angular : 2 premiers niveaux sur 3
    'f-angular': ['l-ang-1', 'l-ang-2'],
    // f-manag : aucun accès (formation verrouillée)
  },
  'usr-2': {
    // Manager : accès complet à tous les niveaux de toutes les formations
    'f-angular': ['l-ang-1', 'l-ang-2', 'l-ang-3'],
    'f-hse': ['l-hse-1', 'l-hse-2', 'l-hse-3'],
    'f-cyber': ['l-cyb-1', 'l-cyb-2'],
    'f-manag': ['l-man-1', 'l-man-2'],
  },
};

/**
 * Vérifie si un utilisateur a accès à une formation
 */
export function hasFormationAccess(userId: string | null | undefined, formationId: string): boolean {
  if (!userId) return false;
  const allowed = FORMATION_ACCESS[userId];
  if (!allowed) return false;
  return allowed.includes(formationId);
}

/**
 * Vérifie si un utilisateur a accès à un niveau spécifique
 * - Si la formation est verrouillée → niveau verrouillé
 * - Si la formation est accessible, vérifie l'accès au niveau
 */
export function hasLevelAccess(
  userId: string | null | undefined,
  formationId: string,
  levelId: string,
): boolean {
  if (!userId) return false;
  // D'abord vérifier l'accès à la formation
  if (!hasFormationAccess(userId, formationId)) return false;

  const userLevels = LEVEL_ACCESS[userId];
  if (!userLevels) return false;

  const formationLevels = userLevels[formationId];
  // Si pas de règle spécifique pour cette formation, on considère que l'accès formation suffit
  // (pour éviter de bloquer par défaut quand on ajoute une nouvelle formation)
  if (!formationLevels) {
    // Pour usr-2 (manager), on autorise tout par défaut si formation accessible
    // Pour les autres, on bloque si pas explicitement autorisé
    return userId === 'usr-2' ? true : false;
  }

  return formationLevels.includes(levelId);
}

/**
 * Retourne la liste des formations accessibles pour un utilisateur
 */
export function getAccessibleFormations(userId: string | null | undefined): FormationId[] {
  if (!userId) return [];
  return FORMATION_ACCESS[userId] ?? [];
}

/**
 * Retourne la liste des formations verrouillées pour un utilisateur
 */
export function getLockedFormations(userId: string | null | undefined, allFormationIds: string[]): FormationId[] {
  const accessible = new Set(getAccessibleFormations(userId));
  return allFormationIds.filter((id) => !accessible.has(id));
}

/**
 * Pour l'UI : indique si on doit afficher le cadenas
 */
export function shouldShowLockIcon(hasAccess: boolean): boolean {
  return !hasAccess;
}

/**
 * Libellés pour affichage fallback
 */
export const FORMATION_LABELS: Record<FormationId, string> = {
  'f-angular': 'Angular & Ionic Mobile',
  'f-hse': 'Sécurité au travail',
  'f-cyber': 'Cybersécurité & RGPD',
  'f-manag': 'Management d’équipe agile',
};

/**
 * Message explicatif pour accès refusé
 */
export function getAccessDeniedMessage(type: 'formation' | 'level'): string {
  if (type === 'formation') {
    return "Vous n'avez pas accès à cette formation. Contactez votre responsable de formation pour demander l'accès.";
  }
  return "Vous n'avez pas accès à ce niveau. Terminez les niveaux précédents ou contactez votre responsable.";
}
