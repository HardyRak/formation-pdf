import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { pdfDataUri } from '../core/utils/binary';

/**
 * Rendu natif d'un vrai PDF (iOS / Android) via `react-native-pdf`.
 * Le PDF est passé en base64 (data URI) : aucune URL publique, le contenu ne
 * transite que par le flux authentifié.
 *
 * ⚠️ `react-native-pdf` est un module natif : nécessite un **development build**
 * (pas Expo Go). Il fournit `onPageChanged` → suivi de progression par page.
 */
export interface PdfViewerProps {
  bytes: Uint8Array;
  pageCount: number;
  currentPage: number;
  accent: string;
  onPageChanged: (page: number) => void;
}

export function PdfViewer({ bytes, pageCount, currentPage, accent, onPageChanged }: PdfViewerProps) {
  const source = useMemo(() => ({ uri: pdfDataUri(bytes) }), [bytes]);

  const handlePageChanged = useCallback(
    (page: number) => onPageChanged(page),
    [onPageChanged],
  );

  return (
    <View style={styles.container}>
      <Pdf
        source={source}
        page={Math.min(Math.max(currentPage, 1), pageCount)}
        style={styles.pdf}
        trustAllCerts
        renderActivityIndicator={() => (
          <ActivityIndicator size="large" color={accent} />
        )}
        onPageChanged={handlePageChanged}
        onError={(err) => {
          // eslint-disable-next-line no-console
          console.warn('[PdfViewer] erreur de rendu PDF', err);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F1E' },
  pdf: { flex: 1, backgroundColor: '#0C0F1E' },
});
