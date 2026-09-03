import type { CSSProperties } from 'react';

export const styles: {
  content: CSSProperties;
  learnerHead: CSSProperties;
  learnerIdentities: CSSProperties;
  learnerName: CSSProperties;
  learnerEmail: CSSProperties;
  globalBlock: CSSProperties;
  globalLabel: CSSProperties;
  globalValue: CSSProperties;
  listBlock: CSSProperties;
  listCount: CSSProperties;
  formationsList: CSSProperties;
  loadingMore: CSSProperties;
  formationRow: CSSProperties;
  formationHead: CSSProperties;
  formationIdentity: CSSProperties;
  formationName: CSSProperties;
  formationMeta: CSSProperties;
  formationBadges: CSSProperties;
  percentLabel: CSSProperties;
  emptyText: CSSProperties;
} = {
  // Sépare l'en-tête (avatar + carte GLOBAL) de la liste des formations.
  content: { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
  learnerHead: { display: 'flex', alignItems: 'center', gap: '14px' },
  learnerIdentities: { flex: 1, minWidth: 0 },
  learnerName: { margin: 0, fontSize: '17px' },
  learnerEmail: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  globalBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--primary-soft)',
    flexShrink: 0,
  },
  globalLabel: { fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' },
  globalValue: { fontSize: '22px', fontWeight: 900, color: 'var(--primary)' },
  listBlock: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' },
  listCount: { fontSize: '12px', color: 'var(--text-faint)' },
  // Zone de défilement dédiée : le scroll ici déclenche le load-more.
  formationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '46vh',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  loadingMore: { fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center', padding: '6px 0' },
  formationRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  formationHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  formationIdentity: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  formationName: { fontWeight: 800, fontSize: '14px' },
  formationMeta: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  formationBadges: { display: 'flex', gap: '8px' },
  percentLabel: { fontSize: '13px', fontWeight: 800, flexShrink: 0 },
  emptyText: { color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' },
};
