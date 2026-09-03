import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { styles } from './PdfReaderScreen.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { spacing } from '../core/theme/theme';
import { READER } from '../core/theme/design-tokens';
import { MessageState } from '../components/StateViews';
import { PdfPageView } from '../components/PdfPageView';
import { PdfViewer } from '../components/PdfViewer';
import { ReaderTopBar } from '../components/ReaderTopBar';
import { ReaderToolbar } from '../components/ReaderToolbar';
import { OutlineSheet } from '../components/OutlineSheet';
import { ResumeToast } from '../components/ResumeToast';
import { pdfReaderStore, usePdfReaderStore, ZOOM_STEPS } from '../core/state/pdf-reader.store';
import { useProgressionStore } from '../core/state/progression.store';
import { formationStore } from '../core/state/formation.store';
import type { PdfPage } from '../core/models';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

const PAGE_GAP = 14;

/**
 * Écran de lecture sécurisée d'un document (PDF binaire ou blocs structurés).
 * Rôle : orchestration (état, effets, navigation, progression). Le chrome est
 * délégué à `ReaderTopBar` / `ReaderToolbar` / `OutlineSheet` / `ResumeToast`.
 */
export function PdfReaderScreen({ route, navigation }: Props) {
  const { documentId } = route.params;
  const { width, height } = useWindowDimensions();
  const state = usePdfReaderStore();
  const progression = useProgressionStore();
  const listRef = useRef<FlatList>(null);
  const [resumeToast, setResumeToast] = useState<number | null>(null);
  /** Erreur de rendu du renderer PDF (distincte de l'erreur de chargement). */
  const [renderError, setRenderError] = useState<string | null>(null);
  /** Force le remontage du renderer lors d'un retry (relance le rendu natif). */
  const [renderAttempt, setRenderAttempt] = useState(0);

  // Protection renforcée pour le lecteur PDF : bloque capture même si App.tsx est modifié
  usePreventScreenCapture();

  const isPdf = state.pdfBytes !== null && state.pdfBytes.length > 0;
  const totalCount = isPdf ? state.pageCount : state.pages.length;

  const accent = useMemo(() => {
    const formationId = state.document?.formationId;
    return (formationId && formationStore.byId(formationId)?.color) || '#4F46E5';
  }, [state.document]);

  useEffect(() => {
    setRenderError(null);
    setRenderAttempt(0);
    void pdfReaderStore.open(documentId);
    return () => pdfReaderStore.close();
  }, [documentId]);

  useEffect(() => {
    if (state.status === 'success' && state.resumePage > 1) {
      setResumeToast(state.resumePage);
      const timer = setTimeout(() => setResumeToast(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.resumePage]);

  // Bouton retour matériel : quitte d'abord le plein écran.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pdfReaderStore.state().fullscreen) {
        pdfReaderStore.toggleFullscreen();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // ---- Mode « blocs » : zoom + mise en page -----------------------------
  const zoom = ZOOM_STEPS[state.zoomIndex];
  const basePageWidth = Math.min(width - 24, 560);
  const pageWidth = Math.round(basePageWidth * zoom);
  const pageHeight = Math.round(pageWidth * 1.414);

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: pageHeight + PAGE_GAP,
      offset: (pageHeight + PAGE_GAP) * index,
      index,
    }),
    [pageHeight],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ReadonlyArray<{ item: PdfPage }> }) => {
    const first = viewableItems?.[0];
    if (first?.item?.number) pdfReaderStore.setPage(first.item.number);
  }).current;

  const scrollToPage = useCallback(
    (page: number, animated = true) => {
      const index = Math.max(0, Math.min(page - 1, state.pages.length - 1));
      listRef.current?.scrollToIndex({ index, animated });
      pdfReaderStore.setPage(index + 1);
    },
    [state.pages.length],
  );

  /** Navigation de page : bascule entre PDF (prop `page`) et blocs (FlatList). */
  const goToPage = useCallback(
    (page: number) => {
      if (isPdf) {
        pdfReaderStore.setPage(page);
      } else {
        scrollToPage(page);
      }
    },
    [isPdf, scrollToPage],
  );

  // Conserve la page courante lors d'un changement de zoom (mode blocs).
  // `getItemLayout` fournit les offsets sans mesurer : le scroll est fiable
  // immédiatement (layout effect), aucun timer nécessaire. La page est lue
  // dans le store (pas en closure) : le zoom ne dépend pas d'elle.
  useLayoutEffect(() => {
    if (isPdf || state.status !== 'success') return;
    const index = Math.max(0, pdfReaderStore.state().currentPage - 1);
    listRef.current?.scrollToIndex({ index, animated: false });
  }, [pageHeight, isPdf, state.status]);

  /** Lignes du sommaire : libellé dérivé une seule fois par lot de pages. */
  const outlineEntries = useMemo(
    () =>
      state.pages.map((page) => ({
        number: page.number,
        label:
          page.blocks.find(
            (b): b is { type: 'h1' | 'h2'; text: string } => b.type === 'h1' || b.type === 'h2',
          )?.text ?? `Page ${page.number}`,
      })),
    [state.pages],
  );

  const progress = state.document ? progression.documents[state.document.id] ?? null : null;
  const percent = progress?.percent ?? 0;
  const chromeVisible = !state.fullscreen;
  // Un document refusé car trop volumineux ne sera pas plus lisible au rejeu.
  const canRetry = state.error?.code !== 'DOCUMENT_TOO_LARGE';

  const close = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: READER.chrome }]}>
      <StatusBar style={'light'} hidden={state.fullscreen} />

      {chromeVisible ? (
        <ReaderTopBar
          title={state.document?.title ?? 'Chargement\u2026'}
          percent={percent}
          accent={accent}
          isPdf={isPdf}
          onBack={close}
          onToggleOutline={() => pdfReaderStore.toggleOutline()}
          onToggleFullscreen={() => pdfReaderStore.toggleFullscreen()}
        />
      ) : null}

      {state.status === 'loading' || state.status === 'idle' ? (
        <View style={styles.center}>
          <ActivityIndicator color={'#fff'} size={'large'} />
          <Text style={styles.loadingText}>Récupération du document sécurisé…</Text>
          <Text style={styles.loadingHint}>Flux authentifié — aucun fichier n’est stocké sur l’appareil</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={[styles.center, { paddingHorizontal: spacing.lg }]}>
          <MessageState
            icon={'lock-closed-outline'}
            tone={'danger'}
            title={'Lecture impossible'}
            message={state.error?.message ?? 'Le document n\u2019a pas pu être chargé.'}
            actionLabel={canRetry ? 'Réessayer' : undefined}
            onAction={canRetry ? () => void pdfReaderStore.open(documentId) : undefined}
          />
          <Pressable onPress={close} style={{ marginTop: spacing.md }}>
            <Text style={{ color: READER.textMuted, fontWeight: '700' }}>Retour aux documents</Text>
          </Pressable>
        </View>
      ) : renderError ? (
        <View style={[styles.center, { paddingHorizontal: spacing.lg }]}>
          <MessageState
            icon={'alert-circle-outline'}
            tone={'danger'}
            title={'Affichage impossible'}
            message={renderError}
            actionLabel={'Réessayer'}
            onAction={() => {
              setRenderError(null);
              setRenderAttempt((attempt) => attempt + 1);
            }}
          />
        </View>
      ) : isPdf && state.pdfBytes ? (
        <PdfViewer
          key={renderAttempt}
          bytes={state.pdfBytes}
          pageCount={state.pageCount}
          currentPage={state.currentPage}
          accent={accent}
          onPageChanged={(page) => pdfReaderStore.setPage(page)}
          onLoadedPageCount={(count) => pdfReaderStore.applyRealPageCount(count)}
          onRenderError={setRenderError}
        />
      ) : (
        <ScrollView
          horizontal
          scrollEnabled={pageWidth + 24 > width}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: Math.max(width, pageWidth + 24) }}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={listRef}
            data={state.pages}
            keyExtractor={(item) => `${item.documentId}-${item.number}`}
            style={{ width: Math.max(width, pageWidth + 24) }}
            contentContainerStyle={{
              paddingVertical: PAGE_GAP,
              paddingBottom: chromeVisible ? 120 : 40,
              alignItems: 'center',
              gap: PAGE_GAP,
            }}
            getItemLayout={getItemLayout}
            initialScrollIndex={Math.max(0, state.resumePage - 1)}
            initialNumToRender={3}
            windowSize={5}
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 120);
            }}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            renderItem={({ item }) => (
              <Pressable onPress={() => pdfReaderStore.toggleFullscreen()} accessibilityLabel={`Page ${item.number}`}>
                <PdfPageView
                  page={item}
                  width={pageWidth}
                  height={pageHeight}
                  accent={accent}
                  documentTitle={state.document?.title ?? ''}
                  totalPages={state.pages.length}
                />
              </Pressable>
            )}
          />
        </ScrollView>
      )}

      {resumeToast ? <ResumeToast page={resumeToast} accent={accent} /> : null}

      {state.fullscreen ? (
        <Pressable
          onPress={() => pdfReaderStore.toggleFullscreen()}
          style={styles.exitFullscreen}
          accessibilityLabel={'Quitter le plein \u00e9cran'}
        >
          <Ionicons name={'contract'} size={18} color={'#fff'} />
        </Pressable>
      ) : null}

      {chromeVisible && state.status === 'success' ? (
        <ReaderToolbar
          currentPage={state.currentPage}
          totalCount={totalCount}
          isPdf={isPdf}
          zoomPercent={Math.round(zoom * 100)}
          canZoomOut={state.zoomIndex > 0}
          canZoomIn={state.zoomIndex < ZOOM_STEPS.length - 1}
          onPrev={() => goToPage(state.currentPage - 1)}
          onNext={() => goToPage(state.currentPage + 1)}
          onZoomOut={() => pdfReaderStore.zoomOut()}
          onZoomIn={() => pdfReaderStore.zoomIn()}
          onResetZoom={() => pdfReaderStore.resetZoom()}
        />
      ) : null}

      <OutlineSheet
        visible={state.outlineVisible}
        entries={outlineEntries}
        currentPage={state.currentPage}
        pagesRead={progress?.pagesRead ?? []}
        accent={accent}
        maxHeight={height * 0.7}
        onSelect={(page) => {
          // La liste est montée sous le sheet : scroll immédiat, puis fermeture.
          scrollToPage(page, false);
          pdfReaderStore.toggleOutline();
        }}
        onClose={() => pdfReaderStore.toggleOutline()}
      />
    </View>
  );
}
