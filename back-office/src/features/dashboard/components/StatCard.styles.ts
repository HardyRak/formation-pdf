import type { CSSProperties } from 'react';

export const styles: { card: CSSProperties; label: CSSProperties; value: CSSProperties } = {
  card: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' },
  value: { fontSize: '30px', fontWeight: 900 },
};
