import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { READER } from '../core/theme/design-tokens';

/**
 * Rendu d'un vrai PDF sur **web** via le lecteur natif du navigateur
 * (`<iframe>` + Blob URL). Aucune URL publique : les octets sont fournis
 * localement après le flux authentifié.
 *
 * Limite connue : le lecteur natif du navigateur n'expose pas la page courante
 * au parent. Le suivi de progression sur web repose donc sur les contrôles
 * « page précédente / suivante » (qui appellent onPageChanged). Un rendu via
 * PDF.js permettrait un suivi de page précis (amélioration future) ;
 * `onLoadedPageCount` n'est donc pas alimenté sur cette plateforme.
 */
export interface PdfViewerProps {
  bytes: Uint8Array;
  pageCount: number;
  currentPage: number;
  accent: string;
  onPageChanged: (page: number) => void;
  /** Non alimenté sur web (le lecteur natif n'expose pas le compte de pages). */
  onLoadedPageCount?: (count: number) => void;
  /** Erreur de rendu : le parent bascule sur un état d'erreur explicite. */
  onRenderError?: (message: string) => void;
}

export function PdfViewer({ bytes, pageCount, currentPage, onRenderError }: PdfViewerProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const created = URL.createObjectURL(blob);
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [bytes]);

  if (!url) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Préparation du document…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {React.createElement('iframe', {
        title: 'PDF',
        src: url,
        style: { width: '100%', height: '100%', border: 'none' },
        onError: () => onRenderError?.('Le navigateur n’a pas pu afficher le PDF.'),
      })}
      <View style={styles.hint}>
        <Text style={styles.hintText}>Page {Math.min(currentPage, pageCount)} / {pageCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: READER.chrome },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { color: READER.textMuted },
  hint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(12,15,30,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
