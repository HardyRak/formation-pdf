import type { CSSProperties } from 'react';
import { inputControl } from './inputControl.styles';

export const styles: {
  root: CSSProperties;
  input: CSSProperties;
  panel: CSSProperties;
  option: CSSProperties;
  optionSelected: CSSProperties;
  createRow: CSSProperties;
  createLabel: CSSProperties;
} = {
  root: {
    position: 'relative',
  },
  input: {
    ...inputControl,
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
  createRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    marginTop: '2px',
    borderTop: '1px solid var(--border)',
    borderRadius: '0 0 8px 8px',
    background: 'transparent',
    color: 'var(--primary)',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  createLabel: {
    fontWeight: 600,
    fontStyle: 'italic',
  },
};
