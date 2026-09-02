import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

/**
 * Variante générique de `PdfViewer` (utilisée si aucune variante de plateforme
 * `PdfViewer.native.tsx` / `PdfViewer.web.tsx` n'est résolue). En pratique,
 * Metro résout `.native.tsx` (iOS/Android) et `.web.tsx` (web).
 */
export interface PdfViewerProps {
  bytes: Uint8Array;
  pageCount: number;
  currentPage: number;
  accent: string;
  onPageChanged: (page: number) => void;
}

export function PdfViewer(_props: PdfViewerProps) {
  return (
    <View style={styles.center}>
      <Text style={{ color: '#9AA3C7' }}>
        Rendu PDF non disponible sur cette plateforme.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
