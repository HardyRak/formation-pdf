import { styles } from './Loading.styles';

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <div style={styles.box}>{label}</div>;
}
