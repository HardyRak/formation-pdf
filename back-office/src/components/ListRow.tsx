import type { CSSProperties, ReactNode } from 'react';
import { styles } from './ListRow.styles';
import { Card } from './Card';

/** Ligne de liste : tuile, titre/sous-titre, badges, actions. */
export function ListRow({
  tile,
  tileStyle,
  title,
  subtitle,
  badges,
  actions,
}: {
  tile?: ReactNode;
  tileStyle?: CSSProperties;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card style={styles.row}>
      {tile ? <div style={{ ...styles.tile, ...tileStyle }}>{tile}</div> : null}
      <div style={styles.body}>
        <div style={styles.title}>{title}</div>
        {subtitle ? <div style={styles.subtitle}>{subtitle}</div> : null}
        {badges ? <div style={styles.badges}>{badges}</div> : null}
      </div>
      {actions ? <div style={styles.actions}>{actions}</div> : null}
    </Card>
  );
}
