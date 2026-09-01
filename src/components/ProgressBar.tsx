import React from 'react';
import { View, Text, DimensionValue } from 'react-native';
import { styles } from './ProgressBar.styles';
import { useTheme, radius } from '../core/theme/theme';

interface Props {
  percent: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ percent, color, height = 8, showLabel = false, label }: Props) {
  const theme = useTheme();
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const tint = color ?? theme.primary;

  return (
    <View style={styles.wrapper}>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{label ?? 'Progression'}</Text>
          <Text style={[styles.value, { color: value === 100 ? theme.success : theme.text }]}>{value} %</Text>
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt, height, borderRadius: height }]}>
        <View
          style={{
            width: `${value}%` as DimensionValue,
            height: '100%',
            backgroundColor: value === 100 ? theme.success : tint,
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );
}

