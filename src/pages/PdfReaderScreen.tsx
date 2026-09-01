import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Modal,
  BackHandler,
  type DimensionValue,
} from 'react-native';
import { styles } from './PdfReaderScreen.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radius, spacing } from '../core/theme/theme';
import { MessageState } from '../components/StateViews';
import { PdfPageView } from '../components/PdfPageView';
import { pdfReaderStore, usePdfReaderStore, ZOOM_STEPS } from '../core/state/pdf-reader.store';
import { progressionStore } from '../core/state/progression.store';
import { formationStore } from '../core/state/formation.store';
import type { PdfPage } from '../core/models';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

const CHROME_BG = '#0C0F1E';
const PAGE_GAP = 14;

export function PdfReaderScreen({ route, navigation }: Props) {
  const { documentId } = route.params;
  const { width, height } = useWindowDimensions();
  const state = usePdfReaderStore();
  const listRef = useRef<FlatList>(null);
  const [resumeToast, setResumeToast] = useState<number | null>(null);

  const accent = useMemo(() => {
    const formationId = state.document?.formationId;
    return (formationId && formationStore.byId(formationId)?.color) || '#4F46E5';
  }, [state.document]);

  useEffect(() => {
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

  const zoom = ZOOM_STEPS[state.zoomIndex];
  const basePageWidth = Math.min(width - 24, 560);
  const pageWidth = Math.round(basePageWidth * zoom);
  const pageHeight = Math.round(pageWidth * 1.414);
  const viewportWidth = Math.min(width, pageWidth + 24);

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

  // Conserve la page courante lors d'un changement de zoom.
  useEffect(() => {
    if (state.status !== 'success') return;
    const index = Math.max(0, state.currentPage - 1);
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 30);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.zoomIndex]);

  const progress = state.document ? progressionStore.documentProgress(state.document.id) : null;
  const percent = progress?.percent ?? 0;
  const chromeVisible = !state.fullscreen;

  const close = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: CHROME_BG }]}>
      <StatusBar style={'light'} hidden={state.fullscreen} />

      {chromeVisible ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: CHROME_BG }}>
            <View style={styles.topBar}>
              <Pressable onPress={close} hitSlop={10} style={styles.iconBtn} accessibilityLabel={'Retour'}>
                <Ionicons name={'chevron-back'} size={22} color={'#fff'} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.topTitle} numberOfLines={1}>
                  {state.document?.title ?? 'Chargement\u2026'}
                </Text>
                <Text style={styles.topSubtitle} numberOfLines={1}>
                  Lecture sécurisée • {percent}% lu
                </Text>
              </View>
              <Pressable
                onPress={() => pdfReaderStore.toggleOutline()}
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityLabel={'Sommaire'}
              >
                <Ionicons name={'list'} size={20} color={'#fff'} />
              </Pressable>
              <Pressable
                onPress={() => pdfReaderStore.toggleFullscreen()}
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityLabel={'Plein \u00e9cran'}
              >
                <Ionicons name={'expand'} size={19} color={'#fff'} />
              </Pressable>
            </View>
            <View style={styles.topProgressTrack}>
              <View style={[styles.topProgressFill, { width: `${percent}%` as DimensionValue, backgroundColor: accent }]} />
            </View>
          </SafeAreaView>
        </Animated.View>
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
            message={state.error?.message ?? 'Le document n\u2019a pas pu \u00eatre charg\u00e9.'}
            actionLabel={'R\u00e9essayer'}
            onAction={() => void pdfReaderStore.open(documentId)}
          />
          <Pressable onPress={close} style={{ marginTop: spacing.md }}>
            <Text style={{ color: '#9AA3C7', fontWeight: '700' }}>Retour aux documents</Text>
          </Pressable>
        </View>
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

      {resumeToast ? (
        <Animated.View entering={FadeInDown} exiting={FadeOut} style={[styles.toast, { borderColor: accent }]}>
          <Ionicons name={'bookmark'} size={15} color={accent} />
          <Text style={styles.toastText}>Reprise à la page {resumeToast}</Text>
        </Animated.View>
      ) : null}

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
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.bottomWrap}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.toolbar}>
              <ToolbarButton
                icon={'chevron-back'}
                disabled={state.currentPage <= 1}
                onPress={() => scrollToPage(state.currentPage - 1)}
                label={'Page pr\u00e9c\u00e9dente'}
              />
              <View style={styles.pageBadge}>
                <Text style={styles.pageBadgeText}>
                  {state.currentPage} / {state.pages.length}
                </Text>
              </View>
              <ToolbarButton
                icon={'chevron-forward'}
                disabled={state.currentPage >= state.pages.length}
                onPress={() => scrollToPage(state.currentPage + 1)}
                label={'Page suivante'}
              />
              <View style={styles.toolbarSep} />
              <ToolbarButton
                icon={'remove'}
                disabled={state.zoomIndex === 0}
                onPress={() => pdfReaderStore.zoomOut()}
                label={'Zoom arri\u00e8re'}
              />
              <Pressable onPress={() => pdfReaderStore.resetZoom()} style={styles.zoomBadge}>
                <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
              </Pressable>
              <ToolbarButton
                icon={'add'}
                disabled={state.zoomIndex === ZOOM_STEPS.length - 1}
                onPress={() => pdfReaderStore.zoomIn()}
                label={'Zoom avant'}
              />
            </View>
          </SafeAreaView>
        </Animated.View>
      ) : null}

      <Modal
        visible={state.outlineVisible}
        animationType={'slide'}
        transparent
        onRequestClose={() => pdfReaderStore.toggleOutline()}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => pdfReaderStore.toggleOutline()} />
        <View style={[styles.sheet, { maxHeight: height * 0.7 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Sommaire</Text>
          <FlatList
            data={state.pages}
            keyExtractor={(item) => `outline-${item.number}`}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            renderItem={({ item }) => {
              const heading = item.blocks.find(
                (b): b is { type: 'h1' | 'h2'; text: string } => b.type === 'h1' || b.type === 'h2',
              );
              const readMark = progress?.pagesRead.includes(item.number);
              return (
                <Pressable
                  onPress={() => {
                    pdfReaderStore.toggleOutline();
                    setTimeout(() => scrollToPage(item.number, false), 120);
                  }}
                  style={({ pressed }) => [styles.outlineRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    style={[
                      styles.outlineNum,
                      { backgroundColor: item.number === state.currentPage ? accent : 'rgba(255,255,255,0.08)' },
                    ]}
                  >
                    <Text style={styles.outlineNumText}>{item.number}</Text>
                  </View>
                  <Text style={styles.outlineLabel} numberOfLines={1}>
                    {heading?.text ?? `Page ${item.number}`}
                  </Text>
                  {readMark ? <Ionicons name={'checkmark-circle'} size={16} color={'#34D399'} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

function ToolbarButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.toolBtn, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={'#fff'} />
    </Pressable>
  );
}

