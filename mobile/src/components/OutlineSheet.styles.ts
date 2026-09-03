import { StyleSheet } from 'react-native';
import { spacing } from '../core/theme/theme';

export const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,6,16,0.6)' },
  sheet: {
    backgroundColor: '#141834',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
  },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 10 },
  outlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  outlineNum: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  outlineNumText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  outlineLabel: { flex: 1, color: '#D9DDF2', fontSize: 14, fontWeight: '600' },
});
