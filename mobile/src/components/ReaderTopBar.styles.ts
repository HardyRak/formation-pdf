import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  topSubtitle: { color: '#8E97C0', fontSize: 11.5, fontWeight: '600', marginTop: 1 },
  topProgressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.09)' },
  topProgressFill: { height: 3 },
});
