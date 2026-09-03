import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,15,30,0.94)' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toolBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  toolbarSep: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 6 },
  pageBadge: { paddingHorizontal: 14, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', minWidth: 78 },
  pageBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  zoomBadge: { paddingHorizontal: 10, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minWidth: 58, backgroundColor: 'rgba(255,255,255,0.06)' },
  zoomText: { color: '#C6CCEA', fontWeight: '800', fontSize: 12.5 },
});
