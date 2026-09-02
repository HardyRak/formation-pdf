import type { CSSProperties } from 'react';

export const styles: {
  shell: CSSProperties;
  sidebar: CSSProperties;
  brand: CSSProperties;
  nav: CSSProperties;
  footer: CSSProperties;
  userRow: CSSProperties;
  userInfo: CSSProperties;
  userName: CSSProperties;
  userEmail: CSSProperties;
  content: CSSProperties;
} = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 'var(--sidebar-width)',
    background: 'var(--bg-elevated)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  brand: { padding: '22px 18px 18px' },
  nav: { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  footer: { padding: '16px 12px', borderTop: '1px solid var(--border)' },
  userRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  userInfo: { minWidth: 0 },
  userName: {
    fontWeight: 800,
    fontSize: '13px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '11px',
    color: 'var(--text-faint)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  content: { flex: 1, padding: '28px 32px', overflow: 'auto' },
};
