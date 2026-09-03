import { StyleSheet } from 'react-native';
import { radius } from '../core/theme/theme';

export const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 96,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(18,22,44,0.96)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
