import { StyleSheet } from 'react-native';
import { radius, spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  skeleton: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  skelIcon: { width: 48, height: 48, borderRadius: radius.md },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingLabel: { fontSize: 13, fontWeight: '600' },
  message: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 10,
  },
  messageIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  messageTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  messageText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  messageBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
