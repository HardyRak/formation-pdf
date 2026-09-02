import type { CSSProperties } from 'react';

export const styles: { list: CSSProperties; descField: CSSProperties; tile: CSSProperties; rowError: CSSProperties } = {
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  descField: { marginTop: '14px' },
  tile: { background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: '18px', fontWeight: 400 },
  rowError: { fontSize: '12px', color: 'var(--danger)' },
};
