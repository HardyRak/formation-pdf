import { StyleSheet } from 'react-native';
import { radius } from '../core/theme/theme';

export const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
});
