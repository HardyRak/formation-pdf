import type { CSSProperties } from 'react';

export const styles: {
  backdrop: CSSProperties;
  panel: CSSProperties;
  header: CSSProperties;
  title: CSSProperties;
  close: CSSProperties;
  body: CSSProperties;
  footer: CSSProperties;
} = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(17, 22, 52, 0.45)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
    overflowY: 'auto',
  },
  panel: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 24px 60px rgba(17, 22, 52, 0.28)',
    width: '100%',
    maxWidth: '760px',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 80px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '18px 22px 0',
  },
  title: {
    margin: 0,
    fontSize: '19px',
    fontWeight: 800,
    color: 'var(--text)',
  },
  close: {
    border: 'none',
    background: 'var(--surface-alt)',
    color: 'var(--text-muted)',
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    fontSize: '16px',
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '16px 22px',
    overflowY: 'auto',
  },
  footer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    padding: '0 22px 20px',
  },
};
