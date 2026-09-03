import { StyleSheet } from 'react-native';

/**
 * Styles propres à l'écran lecteur (le chrome est stylé par ses composants :
 * ReaderTopBar, ReaderToolbar, OutlineSheet, ResumeToast).
 */
export const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
  loadingHint: { color: '#7C86B0', fontSize: 12 },
  exitFullscreen: {
    position: 'absolute',
    right: 16,
    bottom: 30,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(20,24,48,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
