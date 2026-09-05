import { StyleSheet } from 'react-native';
import { radius } from '../core/theme/theme';

export const styles = StyleSheet.create({
  list: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  count: { fontSize: 11, fontWeight: '700' },
});
