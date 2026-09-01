import { StyleSheet } from 'react-native';
import { spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: 4, paddingBottom: spacing.xxl },
  summaryMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryItemText: { fontSize: 12.5, fontWeight: '600' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 17, fontWeight: '900' },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  cardMeta: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 13.5, lineHeight: 19 },
  nextTag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  nextTagText: { color: '#fff', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
});
