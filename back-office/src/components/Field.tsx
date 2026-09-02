import type { ReactNode } from 'react';
import { styles } from './Field.styles';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={styles.label}>{label}{children}</label>;
}
