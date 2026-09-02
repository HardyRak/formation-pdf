import type { CSSProperties } from 'react';

export const styles: {
  box: CSSProperties;
  input: CSSProperties;
  name: CSSProperties;
  placeholder: CSSProperties;
  hint: CSSProperties;
} = {
  box: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px dashed var(--border)',
    background: 'var(--surface)',
    cursor: 'pointer',
    width: '100%',
  },
  input: { display: 'none' },
  name: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  placeholder: { flex: 1, fontSize: '13px', color: 'var(--text-faint)' },
  hint: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--primary)',
    background: 'var(--primary-soft)',
    borderRadius: '999px',
    padding: '2px 8px',
  },
};
