import type { CSSProperties, ReactNode } from 'react';
import { styles } from './FormGrid.styles';

/** Grille responsive de champs de formulaire. */
export function FormGrid({
  children,
  min = 220,
  style,
}: {
  children: ReactNode;
  min?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        ...styles.grid,
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
