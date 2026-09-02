import { FORMATION_ICONS, DEFAULT_FORMATION_ICON } from '../assets/icons';
import { styles } from './FormationIcon.styles';

/**
 * Rend une icône de formation depuis son fichier SVG (mask CSS),
 * teintée avec la couleur de la formation. Nom inconnu → icône par défaut.
 */
export function FormationIcon({ name, color }: { name?: string; color: string }) {
  const url = (name && FORMATION_ICONS[name]) || DEFAULT_FORMATION_ICON;
  return (
    <span
      aria-hidden
      style={{
        ...styles.icon,
        backgroundColor: color,
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
      }}
    />
  );
}
