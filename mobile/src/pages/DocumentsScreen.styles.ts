import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: 4, paddingBottom: spacing.xxl },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  pdfIcon: { width: 50, height: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 1 },
  pdfLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 11, borderTopWidth: 1 },
  sizeText: { fontSize: 11.5, fontWeight: '600' },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill },
  openBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
});
