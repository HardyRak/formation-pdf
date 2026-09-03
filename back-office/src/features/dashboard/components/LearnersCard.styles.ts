import type { CSSProperties } from 'react';

export const styles: {
  card: CSSProperties;
  header: CSSProperties;
  title: CSSProperties;
  count: CSSProperties;
  list: CSSProperties;
  learnerButton: CSSProperties;
  learnerMeta: CSSProperties;
  learnerArrow: CSSProperties;
  footer: CSSProperties;
  pageLabel: CSSProperties;
} = {
  card: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
  },
  title: { margin: 0 },
  count: { fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    maxHeight: '340px',
    overflowY: 'auto',
  },
  learnerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '8px',
    textAlign: 'left',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  learnerMeta: { flex: 1, minWidth: 0 },
  learnerArrow: { color: 'var(--text-faint)', fontSize: '16px', flexShrink: 0 },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
  },
  pageLabel: { fontSize: '13px', color: 'var(--text-muted)' },
};
