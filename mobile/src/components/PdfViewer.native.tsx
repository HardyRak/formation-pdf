import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { pdfDataUriAsync } from '../core/utils/binary';
import { READER } from '../core/theme/design-tokens';

/**
 * Rendu natif d'un vrai PDF (iOS / Android) via `react-native-pdf`.
 * Le PDF est passé en base64 (data URI) : aucune URL publique, le contenu ne
 * transite que par le flux authentifié.
 *
 * ⚠️ `react-native-pdf` est un module natif : nécessite un **development build**
 * (pas Expo Go). Il fournit `onPageChanged` / `onLoadComplete` → suivi de
 * progression par page et nombre de pages réel.
 *
 * Toute erreur de rendu est remontée au parent (`onRenderError`) : l'écran
 * affiche alors un état d'erreur avec retry, jamais un spinner infini.
 */
export interface PdfViewerProps {
  bytes: Uint8Array;
  pageCount: number;
  currentPage: number;
  accent: string;
  onPageChanged: (page: number) => void;
  /** Nombre de pages réel rapporté par le renderer (fait foi sur la métadonnée). */
  onLoadedPageCount?: (count: number) => void;
  /** Erreur de rendu : le parent bascule sur un état d'erreur explicite. */
  onRenderError?: (message: string) => void;
}

export function PdfViewer({
  bytes,
  pageCount,
  currentPage,
  accent,
  onPageChanged,
  onLoadedPageCount,
  onRenderError,
}: PdfViewerProps) {
  const [source, setSource] = useState<{ uri: string } | null>(null);

  // Préparation base64 ASYNCNE et chunkée : l'encodage d'un gros PDF ne fige
  // plus le thread principal (ni le premier rendu du viewer).
  useEffect(() => {
    let cancelled = false;
    setSource(null);
    pdfDataUriAsync(bytes)
      .then((uri) => {
        if (!cancelled) setSource({ uri });
      })
      .catch(() => {
        if (!cancelled) onRenderError?.('Préparation du PDF impossible.');
      });
    return () => {
      cancelled = true;
    };
  }, [bytes, onRenderError]);

  if (!source) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pdf
        source={source}
        page={Math.min(Math.max(currentPage, 1), pageCount)}
        style={styles.pdf}
        renderActivityIndicator={() => (
          <ActivityIndicator size="large" color={accent} />
        )}
        onPageChanged={(page, total) => {
          onPageChanged(page);
          if (total > 0) onLoadedPageCount?.(total);
        }}
        onLoadComplete={(total) => {
          if (total > 0) onLoadedPageCount?.(total);
        }}
        onError={(err) => {
          // eslint-disable-next-line no-console
          console.warn('[PdfViewer] erreur de rendu PDF', err);
          onRenderError?.(err?.message || 'Le PDF n’a pas pu être affiché.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: READER.chrome },
  pdf: { flex: 1, backgroundColor: READER.chrome },
});
