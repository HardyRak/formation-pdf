import type { ReactNode } from 'react';
import { styles } from './Badge.styles';

export function Badge({
  children,
  color = 'var(--primary)',
  bg,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <span style={{ ...styles.badge, background: bg ?? color + '1f', color }}>
      {children}
    </span>
  );
}
