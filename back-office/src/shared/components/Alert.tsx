import type { ReactNode } from 'react';
import { styles } from './Alert.styles';
import { Button } from './Button';

/** Boîte de message : erreur (défaut) ou avertissement, avec rejeu optionnel. */
export function Alert({
  tone = 'error',
  message,
  onRetry,
  children,
}: {
  tone?: 'error' | 'warning';
  message?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <div style={{ ...styles.base, ...(tone === 'error' ? styles.error : styles.warning) }} role="alert">
      {message ?? children ?? (tone === 'error' ? 'Une erreur est survenue.' : null)}
      {onRetry ? (
        <Button variant="ghost" onClick={onRetry} style={styles.retry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
