import type { CSSProperties } from 'react';

export const styles: {
  card: CSSProperties;
  title: CSSProperties;
  error: CSSProperties;
  actions: CSSProperties;
} = {
  card: { marginBottom: '20px' },
  title: { margin: '0 0 16px' },
  error: { marginTop: '12px' },
  actions: { display: 'flex', gap: '10px', marginTop: '16px' },
};
