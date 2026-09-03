import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from './ReaderToolbar.styles';

/**
 * Barre d'outils du lecteur PDF : navigation de page + zoom (mode blocs).
 * Composant présentational : toutes les décisions restent dans l'écran.
 */
export interface ReaderToolbarProps {
  currentPage: number;
  totalCount: number;
  isPdf: boolean;
  zoomPercent: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function ReaderToolbar({
  currentPage,
  totalCount,
  isPdf,
  zoomPercent,
  canZoomIn,
  canZoomOut,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ReaderToolbarProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={styles.bottomWrap}
    >
      <SafeAreaView edges={['bottom']}>
        <View style={styles.toolbar}>
          <ToolbarButton
            icon={'chevron-back'}
            disabled={currentPage <= 1}
            onPress={onPrev}
            label={'Page \u200bpr\u00e9c\u00e9dente'}
          />
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>
              {currentPage} / {totalCount}
            </Text>
          </View>
          <ToolbarButton
            icon={'chevron-forward'}
            disabled={currentPage >= totalCount}
            onPress={onNext}
            label={'Page suivante'}
          />
          {!isPdf ? (
            <>
              <View style={styles.toolbarSep} />
              <ToolbarButton
                icon={'remove'}
                disabled={!canZoomOut}
                onPress={onZoomOut}
                label={'Zoom arri\u00e8re'}
              />
              <Pressable onPress={onResetZoom} style={styles.zoomBadge}>
                <Text style={styles.zoomText}>{zoomPercent}%</Text>
              </Pressable>
              <ToolbarButton
                icon={'add'}
                disabled={!canZoomIn}
                onPress={onZoomIn}
                label={'Zoom avant'}
              />
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </Animated.View>
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
