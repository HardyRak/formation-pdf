import type { CSSProperties } from 'react';

export const styles: {
  base: CSSProperties;
  variants: Record<'primary' | 'secondary' | 'danger' | 'dangerSoft' | 'ghost', CSSProperties>;
} = {
  base: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 0.15s',
    cursor: 'pointer',
  },
  variants: {
    primary: { background: 'var(--primary)', color: '#fff' },
    secondary: { background: 'var(--surface-alt)', color: 'var(--text)' },
    danger: { background: 'var(--danger)', color: '#fff' },
    dangerSoft: { background: 'rgba(220,38,38,0.08)', color: 'var(--danger)' },
    ghost: { background: 'transparent', color: 'var(--primary)' },
  },
};
