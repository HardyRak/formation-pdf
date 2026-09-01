import { StyleSheet } from 'react-native';
import { radius } from '../core/theme/theme';

export const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
