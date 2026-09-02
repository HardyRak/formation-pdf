import type { CSSProperties } from 'react';
import { inputControl } from './inputControl.styles';

export const PALETTE = [
  '#4F46E5', // primary
  '#0EA5A4', // accent
  '#16A34A', // success
  '#D97706', // warning
  '#DC2626', // danger
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D',
  '#B45309',
  '#334155',
];

export const styles: {
  trigger: CSSProperties;
  swatch: CSSProperties;
  placeholder: CSSProperties;
  popover: CSSProperties;
  palette: CSSProperties;
  cell: CSSProperties;
  cellSelected: CSSProperties;
  nativeRow: CSSProperties;
} = {
  trigger: {
    ...inputControl,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    padding: '7px 10px',
  },
  swatch: {
    width: '22px',
    height: '22px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.12)',
    flexShrink: 0,
  },
  placeholder: {
    color: 'var(--text-faint)',
  },
  popover: {
    position: 'absolute',
    zIndex: 30,
    marginTop: '6px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    boxShadow: '0 18px 40px rgba(17, 22, 52, 0.18)',
    padding: '12px',
    width: '100%',
    minWidth: '232px',
  },
  palette: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
  },
  cell: {
    width: '28px',
    height: '28px',
    borderRadius: '9px',
    border: '2px solid transparent',
    cursor: 'pointer',
    padding: 0,
  },
  cellSelected: {
    borderColor: 'var(--text)',
    boxShadow: '0 0 0 2px var(--surface-elevated)',
  },
  nativeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '12px',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
};
