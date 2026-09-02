import type { CSSProperties } from 'react';

export const styles: { row: CSSProperties; back: CSSProperties; title: CSSProperties } = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  back: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: 700,
    fontSize: '13px',
    padding: 0,
    marginBottom: '6px',
    cursor: 'pointer',
  },
  title: { margin: 0 },
};
