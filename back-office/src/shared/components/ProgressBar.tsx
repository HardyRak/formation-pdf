import { styles } from './ProgressBar.styles';

/** Barre de progression ; `color` surcharge la couleur de remplissage. */
export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div style={styles.track}>
      <div
        style={{
          ...styles.fill,
          width: `${width}%`,
          ...(color ? { background: color } : null),
        }}
      />
    </div>
  );
}
