import type { CSSProperties } from 'react';

export const styles: { track: CSSProperties; fill: CSSProperties } = {
  track: {
    height: '10px',
    borderRadius: '999px',
    background: 'var(--surface-alt)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: '999px',
    background: 'var(--primary)',
    transition: 'width 0.4s',
  },
};
