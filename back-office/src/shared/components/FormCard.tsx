import type { ReactNode } from 'react';
import { styles } from './FormCard.styles';
import { Card } from './Card';
import { Button } from './Button';
import { Alert } from './Alert';

/** Carte formulaire : titre, champs, erreur, actions Enregistrer / Annuler. */
export function FormCard({
  title,
  children,
  error,
  submitting,
  submitLabel,
  submitDisabled,
  onSubmit,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  error?: string | null;
  submitting?: boolean;
  submitLabel: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <Card style={styles.card}>
      <h3 style={styles.title}>{title}</h3>
      {children}
      {error ? (
        <div style={styles.error}>
          <Alert message={error} />
        </div>
      ) : null}
      <div style={styles.actions}>
        <Button onClick={onSubmit} loading={submitting} disabled={submitDisabled}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
