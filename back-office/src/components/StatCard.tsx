import { styles } from './StatCard.styles';
import { Card } from './Card';

export function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={{ ...styles.value, color }}>{value}</div>
    </Card>
  );
}
