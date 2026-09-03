import type { CSSProperties } from 'react';

export const styles: {
  hint: CSSProperties;
  sectionTitle: CSSProperties;
  filter: CSSProperties;
  list: CSSProperties;
} = {
  hint: { margin: '0 0 14px', fontSize: '13px', color: 'var(--text-muted)' },
  sectionTitle: { margin: '0 0 12px' },
  filter: { maxWidth: 340, margin: '0 0 16px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
};
