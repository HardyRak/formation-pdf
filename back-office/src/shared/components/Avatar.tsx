import { styles } from './Avatar.styles';

/** Tuile avatar à initiales. */
export function Avatar({
  firstName,
  lastName,
  color,
}: {
  firstName?: string;
  lastName?: string;
  color?: string;
}) {
  return (
    <div style={{ ...styles.tile, background: color ?? 'var(--primary)' }}>
      {firstName?.[0]}
      {lastName?.[0]}
    </div>
  );
}
