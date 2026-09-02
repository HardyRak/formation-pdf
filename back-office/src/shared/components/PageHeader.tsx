import type { ReactNode } from 'react';
import { styles } from './PageHeader.styles';

/** En-tête de page : lien retour optionnel, titre, action à droite. */
export function PageHeader({
  title,
  onBack,
  backLabel = '← Retour',
  action,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div style={styles.row}>
      <div>
        {onBack ? (
          <button style={styles.back} onClick={onBack}>
            {backLabel}
          </button>
        ) : null}
        <h1 style={styles.title}>{title}</h1>
      </div>
      {action ?? null}
    </div>
  );
}
