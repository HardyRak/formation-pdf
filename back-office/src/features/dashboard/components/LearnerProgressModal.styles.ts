import type { CSSProperties } from 'react';

export const styles: {
  learnerHead: CSSProperties;
  learnerIdentities: CSSProperties;
  learnerName: CSSProperties;
  learnerEmail: CSSProperties;
  globalBlock: CSSProperties;
  globalLabel: CSSProperties;
  globalValue: CSSProperties;
  formationRow: CSSProperties;
  formationHead: CSSProperties;
  formationIdentity: CSSProperties;
  formationIcon: CSSProperties;
  formationName: CSSProperties;
  formationMeta: CSSProperties;
  percentLabel: CSSProperties;
  emptyText: CSSProperties;
} = {
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
  formationIcon: { fontSize: '20px', flexShrink: 0 },
  formationName: { fontWeight: 800, fontSize: '14px' },
  formationMeta: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  percentLabel: { fontSize: '13px', fontWeight: 800, flexShrink: 0 },
  emptyText: { color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' },
};
