import type { ReactNode } from 'react';
import { styles } from './Empty.styles';

export function Empty({ label = 'Aucune donnée', action }: { label?: string; action?: ReactNode }) {
  return (
    <div style={styles.box}>
      {label}
      {action ? <div style={styles.action}>{action}</div> : null}
    </div>
  );
}
