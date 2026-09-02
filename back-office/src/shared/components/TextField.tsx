import type { InputHTMLAttributes } from 'react';
import { styles } from './TextField.styles';

/** Champ texte. `invalid` passe la bordure en rouge (erreur de validation). */
export function TextField({
  invalid,
  style,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      style={{
        ...styles.input,
        ...(invalid ? { borderColor: 'var(--danger)' } : null),
        ...style,
      }}
    />
  );
}
