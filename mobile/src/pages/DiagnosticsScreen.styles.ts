import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '800' },
  summarySub: { fontSize: 12.5, lineHeight: 17 },
  counters: { flexDirection: 'row', gap: 8 },
  counter: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 16, fontWeight: '900' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: spacing.md },
  loadingText: { fontSize: 13 },
  suiteTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  testName: { fontSize: 13.5, fontWeight: '600' },
  testDetail: { fontSize: 11.5, fontWeight: '600' },
  testDuration: { fontSize: 11, fontWeight: '700' },
});
