import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { styles } from './ComboBox.styles';

/**
 * Champ de saisie **recherche + création** :
 *  - on tape pour filtrer les `options` existantes ;
 *  - on peut choisir une option au clic / Entrée ;
 *  - si la valeur saisie n'existe pas, une ligne « Créer « … » » permet de la
 *    créer à la volée.
 *
 * Composant contrôlé (comportement d'un `<input>` texte).
 */
export function ComboBox({
  value,
  onChange,
  options,
  placeholder,
  allowCreate = true,
  onCreate,
  onError,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowCreate?: boolean;
  /**
   * Quand fourni, appelé lors du choix de « Créer… » (création persistée en
   * BDD). Reçoit le nom saisi ; si la promesse résout avec une chaîne, c'est
   * cette valeur (normalisée par le serveur) qui est posée dans le champ.
   */
  onCreate?: (name: string) => Promise<string | void> | string | void;
  /** Notifie un échec de création (ex. réseau / serveur) pour l'afficher. */
  onError?: (message: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const query = value.trim().toLowerCase();
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query)).slice(0, 20),
    [options, query],
  );
  // Une valeur saisie qui ne correspond à aucune option → proposition de création.
  const canCreate = allowCreate && query.length > 0 && !options.some((o) => o.toLowerCase() === query);

  // Navigation clavier : ↓/↑ dans la liste + création, Entrée, Échap.
  const rows: Array<{ kind: 'option'; label: string } | { kind: 'create'; label: string }> = [
    ...filtered.map((label) => ({ kind: 'option' as const, label })),
    ...(canCreate ? [{ kind: 'create' as const, label: value.trim() }] : []),
  ];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const choose = async (label: string, isCreate = false) => {
    setCreateError(null);
    // Création persistée : on appelle `onCreate` puis on pose la valeur
    // (normalisée par le serveur s'il en retourne une).
    if (isCreate && onCreate) {
      setCreating(true);
      try {
        const created = await onCreate(label);
        onChange(typeof created === 'string' && created ? created : label);
      } catch (err) {
        // Échec réseau/serveur : on reste ouvert et on affiche l'erreur
        // (sinon promesse non gérée + fermeture silencieuse).
        const message = (err as { message?: string } | null)?.message ?? 'Échec de la création.';
        setCreateError(message);
        onError?.(message);
        setCreating(false);
        return;
      }
      setCreating(false);
    } else {
      onChange(label);
    }
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && rows[activeIndex]) {
        const row = rows[activeIndex];
        e.preventDefault();
        void choose(row.label, row.kind === 'create');
      } else if (canCreate) {
        // Entrée avec une saisie libre non matchée → on crée.
        e.preventDefault();
        void choose(value.trim(), true);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} style={styles.root}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        value={value}
        placeholder={creating ? 'Création…' : placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setCreateError(null);
          setOpen(true);
          setActiveIndex(-1);
        }}
        aria-busy={creating}
        readOnly={creating}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{ ...styles.input, ...(invalid ? { borderColor: 'var(--danger)' } : null) }}
      />

      {open && rows.length > 0 ? (
        <div id={listId} role="listbox" style={styles.popover}>
          {filtered.map((label, i) => {
            const selected = label.toLowerCase() === query;
            const active = i === activeIndex;
            return (
              <button
                key={label}
                type="button"
                role="option"
                aria-selected={selected}
                id={`${listId}-${i}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(label)}
                style={{ ...styles.option, ...(selected || active ? styles.optionSelected : null) }}
              >
                {label}
                {selected ? <span>✓</span> : null}
              </button>
            );
          })}
          {canCreate ? (
            <button
              type="button"
              role="option"
              id={`${listId}-${filtered.length}`}
              onMouseEnter={() => setActiveIndex(filtered.length)}
              onClick={() => void choose(value.trim(), true)}
              style={{
                ...styles.createRow,
                ...(activeIndex === filtered.length ? styles.optionSelected : null),
              }}
            >
              <span>{creating ? '⏳' : '＋'}</span>
              <span>{creating ? 'Création… « ' : 'Créer « '}</span>
              <span style={styles.createLabel}>{value.trim()}</span>
              <span> »</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {createError ? (
        <p
          role="alert"
          style={{ margin: '6px 0 0', fontSize: '12.5px', fontWeight: 600, color: 'var(--danger)' }}
        >
          {createError}
        </p>
      ) : null}
    </div>
  );
}
