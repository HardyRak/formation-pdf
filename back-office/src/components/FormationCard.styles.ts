import type { CSSProperties } from 'react';

export const styles: {
  card: CSSProperties;
  header: CSSProperties;
  tile: CSSProperties;
  names: CSSProperties;
  name: CSSProperties;
  category: CSSProperties;
  description: CSSProperties;
  counts: CSSProperties;
  actions: CSSProperties;
  actionButton: CSSProperties;
} = {
  card: { display: 'flex', flexDirection: 'column', gap: '12px' },
  header: { display: 'flex', alignItems: 'center', gap: '10px' },
  tile: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  names: { flex: 1, minWidth: 0 },
  name: {
    fontWeight: 800,
    fontSize: '15px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  category: { fontSize: '12px', color: 'var(--text-muted)' },
  description: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    minHeight: '40px',
  },
  counts: { display: 'flex', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-faint)' },
  actions: { display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' },
  // Boutons compacts : les 3 actions tiennent sur UNE ligne dans la carte.
  actionButton: { padding: '10px 12px' },
};
