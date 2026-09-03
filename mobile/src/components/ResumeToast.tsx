import React from 'react';
import { Text } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from './ResumeToast.styles';

/** Toast éphémère « Reprise à la page N » affiché à l'ouverture du lecteur. */
export interface ResumeToastProps {
  page: number;
  accent: string;
}

export function ResumeToast({ page, accent }: ResumeToastProps) {
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOut} style={[styles.toast, { borderColor: accent }]}>
      <Ionicons name={'bookmark'} size={15} color={accent} />
      <Text style={styles.toastText}>Reprise à la page {page}</Text>
    </Animated.View>
  );
}
