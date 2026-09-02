import type { CSSProperties } from 'react';

export const styles: { grid: CSSProperties; descField: CSSProperties } = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  descField: { marginTop: '14px' },
};
