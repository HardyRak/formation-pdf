import { useId, useRef, useState } from 'react';
import { Popover } from './Popover';
import { PALETTE, styles } from './ColorPicker.styles';

/**
 * Sélecteur de couleur dédié (équivalent « pensé comme » un champ couleur,
 * mais avec une palette d'entreprise + choix libre). Composant contrôlé.
 *
 * Le déclencheur est une pastille de la couleur courante ; le panneau
 * (palette + `<input type="color">`) s'ouvre dans un `Popover` (portail).
 */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

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

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={rootRef} minWidth={232}>
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
      </Popover>
    </div>
  );
}
