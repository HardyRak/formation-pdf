import type { CSSProperties, ReactNode } from 'react';
import { styles } from './Card.styles';

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...styles.card, ...style }}>{children}</div>;
}
