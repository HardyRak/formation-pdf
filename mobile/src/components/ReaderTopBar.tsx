import React from 'react';
import { View, Text, Pressable, type DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { READER } from '../core/theme/design-tokens';
import { styles } from './ReaderTopBar.styles';

/**
 * Barre supérieure du lecteur PDF : retour, titre, % lu, sommaire (mode blocs),
 * plein écran et jauge de progression. Chrome sombre immersif.
 */
export interface ReaderTopBarProps {
  title: string;
  percent: number;
  accent: string;
  isPdf: boolean;
  onBack: () => void;
  onToggleOutline: () => void;
  onToggleFullscreen: () => void;
}

export function ReaderTopBar({
  title,
  percent,
  accent,
  isPdf,
  onBack,
  onToggleOutline,
  onToggleFullscreen,
}: ReaderTopBarProps) {
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: READER.chrome }}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn} accessibilityLabel={'Retour'}>
            <Ionicons name={'chevron-back'} size={22} color={'#fff'} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.topSubtitle} numberOfLines={1}>
              Lecture sécurisée • {percent}% lu
            </Text>
          </View>
          {!isPdf ? (
            <Pressable
              onPress={onToggleOutline}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityLabel={'Sommaire'}
            >
              <Ionicons name={'list'} size={20} color={'#fff'} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onToggleFullscreen}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel={'Plein \u00e9cran'}
          >
            <Ionicons name={'expand'} size={19} color={'#fff'} />
          </Pressable>
        </View>
        <View style={styles.topProgressTrack}>
          <View
            style={[styles.topProgressFill, { width: `${percent}%` as DimensionValue, backgroundColor: accent }]}
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
