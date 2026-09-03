import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Popover } from './Popover';
import { styles } from './SearchSelect.styles';

export interface SearchSelectOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Select avec recherche : on tape pour filtrer les `options`, on sélectionne
 * une option au clic / Entrée ou flèches. Contrairement à `ComboBox`, il ne
 * permet pas de créer une valeur : il sélectionne une option existante par son
 * `value` (id), avec affichage de son `label`.
 *
 * Panneau rendu dans un portail (`Popover`), contrôlé comme un `<select>`.
 */
export function SearchSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Rechercher…',
  disabled,
  selectedLabel,
  onSearch,
  isLoading,
  searchError,
}: {
  value: T | '';
  onChange: (value: T | '') => void;
  options: SearchSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  /** Libellé de la valeur sélectionnée si elle n'est pas dans les `options` courantes. */
  selectedLabel?: string;
  /** Recherche pilotée par le parent (appel distant) ; reçoit la saisie brute. */
  onSearch?: (search: string) => void;
  /** État de chargement de la recherche distante. */
  isLoading?: boolean;
  /** Erreur de recherche distante. */
  searchError?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [text, setText] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected =
    options.find((option) => option.value === value) ??
    (selectedLabel ? { value: value as T, label: selectedLabel } : undefined);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
    onSearch?.('');
  };

  // Synchronise l'affichage quand la valeur (ou son libellé, chargé en async)
  // change, sans écraser une recherche en cours.
  useEffect(() => {
    if (!open) setText(selected?.label ?? '');
  }, [open, selected?.label]);

  const query = text.trim().toLowerCase();
  const filtered = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query)),
    [options, query],
  );

  // Garde la flèche dans les bornes après un nouveau filtrage.
  useEffect(() => {
    setActiveIndex((current) => Math.min(current, filtered.length - 1));
  }, [filtered]);

  const choose = (option: SearchSelectOption<T>) => {
    onChange(option.value);
    setText(option.label);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        choose(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      close();
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
        aria-disabled={disabled}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          onSearch?.(next);
          if (next.trim() === '' && value !== '') onChange('');
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
          inputRef.current?.select();
        }}
        onKeyDown={onKeyDown}
        style={{ ...styles.input, ...(disabled ? styles.inputDisabled : null) }}
      />

      <Popover open={open} onClose={close} anchorRef={rootRef} minWidth={220}>
        <div id={listId} role="listbox" style={styles.panel}>
          {filtered.length > 0 ? (
            filtered.map((option, i) => {
              const active = i === activeIndex;
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  id={`${listId}-${i}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(option)}
                  style={{
                    ...styles.option,
                    ...(isSelected || active ? styles.optionSelected : null),
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected ? <span>✓</span> : null}
                </button>
              );
            })
          ) : isLoading ? (
            <p style={styles.empty}>Recherche…</p>
          ) : searchError ? (
            <p style={styles.error}>{searchError}</p>
          ) : (
            <p style={styles.empty}>{options.length === 0 ? 'Aucune option disponible' : 'Aucun résultat'}</p>
          )}
        </div>
      </Popover>
    </div>
  );
}
