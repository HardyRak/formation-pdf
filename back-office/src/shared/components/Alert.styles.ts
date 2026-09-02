import type { CSSProperties } from 'react';

export const styles: {
  base: CSSProperties;
  error: CSSProperties;
  warning: CSSProperties;
  retry: CSSProperties;
} = {
  base: {
    padding: '12px 16px',
    borderRadius: '12px',
  },
  error: {
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.25)',
    color: 'var(--danger)',
  },
  warning: {
    background: 'rgba(217,119,6,0.08)',
    border: '1px solid rgba(217,119,6,0.3)',
    color: 'var(--warning)',
  },
  retry: { marginLeft: '12px' },
};
