import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  summary: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
    marginBottom: spacing.md,
  },
  text: { fontSize: 13.5, lineHeight: 19 },
});
