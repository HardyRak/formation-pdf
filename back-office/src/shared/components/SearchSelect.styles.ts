import type { CSSProperties } from 'react';
import { inputControl } from './inputControl.styles';

export const styles: {
  root: CSSProperties;
  input: CSSProperties;
  inputDisabled: CSSProperties;
  panel: CSSProperties;
  option: CSSProperties;
  optionSelected: CSSProperties;
  empty: CSSProperties;
  error: CSSProperties;
} = {
  root: {
    position: 'relative',
  },
  input: {
    ...inputControl,
  },
  inputDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  // Rendu dans un portail (Popover) : pas de positionnement ici.
  panel: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: '0 18px 40px rgba(17, 22, 52, 0.16)',
    padding: '6px',
    width: '100%',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: '14px',
    cursor: 'pointer',
  },
  optionSelected: {
    background: 'var(--primary-soft)',
    color: 'var(--primary)',
    fontWeight: 700,
  },
  empty: {
    margin: 0,
    padding: '8px 10px',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  error: {
    margin: 0,
    padding: '8px 10px',
    color: 'var(--danger)',
    fontSize: '14px',
    fontWeight: 600,
  },
};
