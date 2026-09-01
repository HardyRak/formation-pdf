import { StyleSheet } from 'react-native';
import { radius } from '../core/theme/theme';

export const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 54,
    borderRadius: radius.md,
    paddingHorizontal: 15,
  },
  input: { flex: 1, fontSize: 15.5, paddingVertical: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { fontSize: 12.5, fontWeight: '600' },
});
