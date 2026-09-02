/** Petit message d'erreur de validation affiché sous un champ de formulaire. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      style={{
        margin: '6px 0 0',
        fontSize: '12.5px',
        fontWeight: 600,
        color: 'var(--danger)',
        lineHeight: 1.3,
      }}
    >
      {message}
    </p>
  );
}
