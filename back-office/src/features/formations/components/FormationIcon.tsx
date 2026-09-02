import { FormationGlyph } from '@/assets/icons/formations';
import { styles } from './FormationIcon.styles';

/**
 * Rendu d'une icône de formation (SVG inline « trait ») teintée par la couleur
 * de la formation. Nom inconnu → icône par défaut (bibliothèque).
 */
export function FormationIcon({ name, color, size = 20 }: { name?: string; color: string; size?: number }) {
  return (
    <span style={styles.wrap} aria-hidden>
      <FormationGlyph name={name ?? 'library'} color={color} size={size} />
    </span>
  );
}
