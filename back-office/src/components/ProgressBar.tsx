import { styles } from './ProgressBar.styles';

export function ProgressBar({ percent }: { percent: number }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div style={styles.track}>
      <div style={{ ...styles.fill, width: `${width}%` }} />
    </div>
  );
}
