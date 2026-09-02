import type { CSSProperties } from 'react';

export const styles: {
  row: CSSProperties;
  tile: CSSProperties;
  body: CSSProperties;
  title: CSSProperties;
  subtitle: CSSProperties;
  badges: CSSProperties;
  actions: CSSProperties;
} = {
  row: { display: 'flex', alignItems: 'center', gap: '14px' },
  tile: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '16px',
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontWeight: 800,
    fontSize: '15px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badges: { display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' },
  actions: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
};
