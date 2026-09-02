import library from './library.svg';
import lockClosed from './lock-closed.svg';
import people from './people.svg';
import phonePortrait from './phone-portrait.svg';
import shieldCheckmark from './shield-checkmark.svg';

/**
 * Icônes SVG disponibles pour les formations (fichiers `.svg` dédiés,
 * rendues par `FormationIcon` via mask → teintées par la couleur de la
 * formation). Le nom stocké côté API est la clé (compat seed / mobile).
 */
export const FORMATION_ICONS: Record<string, string> = {
  library,
  'lock-closed': lockClosed,
  people,
  'phone-portrait': phonePortrait,
  'shield-checkmark': shieldCheckmark,
};

export const DEFAULT_FORMATION_ICON = library;
