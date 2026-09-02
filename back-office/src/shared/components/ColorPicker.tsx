import { useEffect, useId, useRef, useState } from 'react';
import { PALETTE, styles } from './ColorPicker.styles';

/**
 * Sélecteur de couleur dédié (équivalent « pensé comme » un champ couleur,
 * mais avec une palette d'entreprise + choix libre). Composant contrôlé.
 *
 * Le déclencheur est une pastille de la couleur courante ; le panneau propose
 * une palette prédéfinie et un `<input type="color">` natif pour le libre choix.
 */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((v) => !v)}
        style={styles.trigger}
      >
        <span style={{ ...styles.swatch, background: value || '#4F46E5' }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '14px', color: 'var(--text)' }}>
          {value ? value.toUpperCase() : <span style={styles.placeholder}>Choisir une couleur…</span>}
        </span>
        <span aria-hidden style={{ color: 'var(--text-faint)', fontSize: '12px' }}>
          ▾
        </span>
      </button>

      {open ? (
        <div id={popoverId} role="dialog" style={styles.popover}>
          <div style={styles.palette}>
            {PALETTE.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                aria-label={hex}
                aria-pressed={hex.toLowerCase() === value.toLowerCase()}
                onClick={() => {
                  onChange(hex);
                  setOpen(false);
                }}
                style={{
                  ...styles.cell,
                  background: hex,
                  ...(hex.toLowerCase() === value.toLowerCase() ? styles.cellSelected : null),
                }}
              />
            ))}
          </div>
          <div style={styles.nativeRow}>
            <span>Couleur libre</span>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: '40px',
                height: '32px',
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
