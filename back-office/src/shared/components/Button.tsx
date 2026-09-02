import type { ButtonHTMLAttributes } from 'react';
import { styles } from './Button.styles';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerSoft' | 'ghost';

export function Button({
  variant = 'primary',
  loading,
  disabled,
  style,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      style={{
        ...styles.base,
        ...styles.variants[variant],
        opacity: disabled || loading ? 0.5 : 1,
        ...style,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Chargement…' : children}
    </button>
  );
}
