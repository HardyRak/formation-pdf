import type { CSSProperties } from 'react';

export const styles: {
  wrapper: CSSProperties;
  card: CSSProperties;
  brand: CSSProperties;
  heading: CSSProperties;
  intro: CSSProperties;
  notice: CSSProperties;
  fields: CSSProperties;
  alertWrap: CSSProperties;
  submit: CSSProperties;
  footer: CSSProperties;
} = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '32px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 10px 30px rgba(11,16,48,0.08)',
  },
  brand: { marginBottom: '8px' },
  heading: { fontSize: '20px', margin: '4px 0 4px' },
  intro: { color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px' },
  notice: { marginBottom: '16px' },
  fields: { display: 'flex', flexDirection: 'column', gap: '14px' },
  alertWrap: { marginTop: '16px' },
  submit: { width: '100%', marginTop: '20px', justifyContent: 'center' },
  footer: { marginTop: '20px', fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center' },
};
