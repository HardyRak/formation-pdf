import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.6 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  userName: { fontSize: 18, fontWeight: '800' },
  userMail: { fontSize: 13 },
  roleTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, marginTop: 2 },
  roleText: { fontSize: 11, fontWeight: '800' },
  sectionTitle: { fontSize: 16.5, fontWeight: '800', marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  infoLabel: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  infoValue: { fontSize: 13.5, fontWeight: '800' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logStatus: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  logPath: { flex: 1, fontSize: 12, fontWeight: '600' },
  logTime: { fontSize: 11, fontWeight: '700' },
  logEmpty: { fontSize: 12.5 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  actionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14.5, fontWeight: '700' },
  actionHint: { fontSize: 11.5 },
  version: { fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
