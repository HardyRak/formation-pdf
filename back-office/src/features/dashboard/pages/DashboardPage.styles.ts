import type { CSSProperties } from 'react';

export const styles: {
  title: CSSProperties;
  statsGrid: CSSProperties;
  sections: CSSProperties;
  sectionTitle: CSSProperties;
  emptyText: CSSProperties;
  row: CSSProperties;
  rowHead: CSSProperties;
  rowName: CSSProperties;
  pctLabel: CSSProperties;
} = {
  title: { fontSize: '24px', margin: '0 0 24px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  sections: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '24px' },
  sectionTitle: { margin: '0 0 16px' },
  emptyText: { color: 'var(--text-faint)' },
  row: { display: 'flex', flexDirection: 'column', gap: '6px' },
  rowHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontWeight: 700, fontSize: '14px' },
  pctLabel: { fontSize: '12px', color: 'var(--text-faint)' },
};
