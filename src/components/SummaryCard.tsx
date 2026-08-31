import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, radius, spacing, shadow } from '../core/theme/theme';
import { ProgressBar } from './ProgressBar';

interface Props {
  description: string;
  percent: number;
  color: string;
  progressLabel?: string;
  elevation?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Carte de résumé d'entité (formation, niveau…) affichant une description,
 * une barre de progression et éventuellement des métadonnées supplémentaires.
 */
export function SummaryCard({
  description,
  percent,
  color,
  progressLabel,
  elevation = 3,
  children,
  style,
}: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.summary,
        { backgroundColor: theme.surface, borderColor: theme.border },
        shadow(elevation),
        style,
      ]}
    >
      <Text style={[styles.text, { color: theme.textMuted }]}>{description}</Text>
      {children}
      <ProgressBar percent={percent} color={color} showLabel label={progressLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
    marginBottom: spacing.md,
  },
  text: { fontSize: 13.5, lineHeight: 19 },
});
