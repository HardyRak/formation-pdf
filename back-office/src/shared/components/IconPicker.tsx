import { useEffect, useId, useRef, useState } from 'react';
import { FORMATION_ICON_NAMES, FormationGlyph } from '@/assets/icons/formations';
import { styles } from './IconPicker.styles';

/**
 * Sélecteur d'icônes dédié (comme un champ couleur, mais avec une grille de
 * pictogrammes). Composant contrôlé : `value` / `onChange(name)`.
 *
 * Le rendu est un bouton-déclencheur affichant l'icône courante ; au clic, un
 * panneau liste toutes les icônes disponibles dans une grille.
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

  // Ferme le panneau quand on clique à l'extérieur ou sur Échap.
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

      {open ? (
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
      ) : null}
    </div>
  );
}
