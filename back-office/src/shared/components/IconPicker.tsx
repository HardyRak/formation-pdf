import { useId, useRef, useState } from 'react';
import { FORMATION_ICON_NAMES, FormationGlyph } from '@/assets/icons/formations';
import { Popover } from './Popover';
import { styles } from './IconPicker.styles';

/**
 * Sélecteur d'icônes dédié (comme un champ couleur, mais avec une grille de
 * pictogrammes). Composant contrôlé : `value` / `onChange(name)`.
 *
 * Le déclencheur affiche l'icône courante ; au clic, une grille de toutes les
 * icônes s'ouvre dans un `Popover` (portail : non rogné par une modale).
 */
export function IconPicker({
  value,
  onChange,
  color = 'var(--primary)',
  options = FORMATION_ICON_NAMES,
}: {
  value: string;
  onChange: (icon: string) => void;
  color?: string;
  options?: string[];
}) {
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
        style={{ ...styles.trigger, ...(open ? styles.triggerSelected : null) }}
      >
        <FormationGlyph name={value} color={color} size={20} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '14px' }}>
          {value || <span style={styles.placeholder}>Choisir une icône…</span>}
        </span>
        <span aria-hidden style={{ color: 'var(--text-faint)', fontSize: '12px' }}>
          ▾
        </span>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={rootRef} minWidth={320}>
        <div id={popoverId} role="dialog" style={styles.popover}>
          <div style={styles.grid}>
            {options.map((name) => {
              const selected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  style={{ ...styles.cell, ...(selected ? styles.cellSelected : null) }}
                >
                  <FormationGlyph
                    name={name}
                    color={selected ? 'var(--primary)' : 'var(--text-muted)'}
                    size={20}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </Popover>
    </div>
  );
}
