import type { CSSProperties } from 'react';

/** Base visuelle partagée par TextField / TextArea / Select. */
export const inputControl: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  width: '100%',
};
