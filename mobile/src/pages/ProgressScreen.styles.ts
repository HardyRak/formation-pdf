import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.6 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.lg, borderRadius: radius.lg },
  heroLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  heroHint: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5 },
  heroStats: { gap: 10 },
  heroStat: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 82 },
  heroStatValue: { color: '#fff', fontSize: 19, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, marginTop: -spacing.xs },
  syncBadgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14.5, fontWeight: '700' },
  rowMeta: { fontSize: 12, fontWeight: '600' },
  rowValue: { fontSize: 13.5, fontWeight: '800', minWidth: 42, textAlign: 'right' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  resetText: { fontSize: 13.5, fontWeight: '700' },
});
