import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 11,
  },
});
