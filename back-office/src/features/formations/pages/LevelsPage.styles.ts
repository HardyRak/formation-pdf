import type { CSSProperties } from 'react';

export const styles: { list: CSSProperties; descField: CSSProperties; tile: CSSProperties } = {
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  descField: { marginTop: '14px' },
  tile: { background: 'var(--primary-soft)', color: 'var(--primary)' },
};
