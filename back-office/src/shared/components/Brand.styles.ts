import type { CSSProperties } from 'react';

export const styles: {
  row: CSSProperties;
  rowLg: CSSProperties;
  tile: CSSProperties;
  tileLg: CSSProperties;
  title: CSSProperties;
  titleLg: CSSProperties;
  subtitle: CSSProperties;
  subtitleLg: CSSProperties;
} = {
  row: { display: 'flex', alignItems: 'center', gap: '10px' },
  rowLg: { display: 'flex', alignItems: 'center', gap: '12px' },
  tile: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  tileLg: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  title: { fontWeight: 800, fontSize: '15px' },
  titleLg: { fontWeight: 800, fontSize: '18px' },
  subtitle: { fontSize: '11px', color: 'var(--text-faint)', fontWeight: 700 },
  subtitleLg: { fontSize: '12px', color: 'var(--text-faint)', fontWeight: 700 },
};
