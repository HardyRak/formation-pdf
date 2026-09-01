import React from 'react';
import { View, Text, ActivityIndicator, Pressable, type DimensionValue } from 'react-native';
import { styles } from './StateViews.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, radius, spacing } from '../core/theme/theme';

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.skeleton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.skelIcon, { backgroundColor: theme.surfaceAlt }]} />
      <View style={{ flex: 1, gap: 10 }}>
        {Array.from({ length: lines }).map((_, index) => (
          <View
            key={index}
            style={{
              height: index === 0 ? 14 : 10,
              width: `${index === 0 ? 70 : 90 - index * 18}%` as DimensionValue,
              backgroundColor: theme.surfaceAlt,
              borderRadius: radius.sm,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function LoadingState({ count = 4, label }: { count?: number; label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      {label ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.loadingLabel, { color: theme.textMuted }]}>{label}</Text>
        </View>
      ) : null}
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

interface MessageProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
}

export function MessageState({ icon, title, message, actionLabel, onAction, tone = 'neutral' }: MessageProps) {
  const theme = useTheme();
  const accent = tone === 'danger' ? theme.danger : theme.primary;
  return (
    <View style={[styles.message, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.messageIcon, { backgroundColor: accent + '1F' }]}>
        <Ionicons name={icon} size={26} color={accent} />
      </View>
      <Text style={[styles.messageTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.messageText, { color: theme.textMuted }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.messageBtn, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name={'refresh'} size={16} color={'#fff'} />
          <Text style={styles.messageBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

