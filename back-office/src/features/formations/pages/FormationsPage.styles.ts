import type { CSSProperties } from 'react';

export const styles: { grid: CSSProperties; descField: CSSProperties } = {
  // minmax 340px : garantit une ligne d'actions (Niveaux / Éditer / Supprimer)
  // sans débordement ni retour à la ligne dans le cas nominal.
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  descField: { marginTop: '14px' },
};
