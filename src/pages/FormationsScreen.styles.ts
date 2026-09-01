import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hello: { fontSize: 13.5, fontWeight: '600' },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.6 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.md, borderRadius: radius.lg },
  bannerLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  bannerValue: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  bannerHint: { color: 'rgba(255,255,255,0.78)', fontSize: 12 },
  bannerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCircleText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
