import type { CSSProperties } from 'react';
import { inputControl } from './inputControl.styles';

export const styles: {
  trigger: CSSProperties;
  triggerSelected: CSSProperties;
  placeholder: CSSProperties;
  popover: CSSProperties;
  grid: CSSProperties;
  cell: CSSProperties;
  cellSelected: CSSProperties;
} = {
  trigger: {
    ...inputControl,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px 10px',
  },
  triggerSelected: {
    color: 'var(--primary)',
  },
  placeholder: {
    color: 'var(--text-faint)',
  },
  // Rendu dans un portail (Popover) : pas de positionnement ici.
  popover: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    boxShadow: '0 18px 40px rgba(17, 22, 52, 0.18)',
    padding: '10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
    gap: '6px',
  },
  cell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
  },
  cellSelected: {
    borderColor: 'var(--primary)',
    color: 'var(--primary)',
    background: 'var(--primary-soft)',
  },
};
