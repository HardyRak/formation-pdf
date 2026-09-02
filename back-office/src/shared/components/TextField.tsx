import { forwardRef, type InputHTMLAttributes } from 'react';
import { styles } from './TextField.styles';

/**
 * Champ texte. `invalid` passe la bordure en rouge (erreur de validation).
 * `forwardRef` requis pour que react-hook-form (`register`) puisse lier le
 * champ natif (sans ref, RHF ne suit pas les saisies).
 */
export const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function TextField({ invalid, style, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      style={{
        ...styles.input,
        ...(invalid ? { borderColor: 'var(--danger)' } : null),
        ...style,
      }}
    />
  );
});
