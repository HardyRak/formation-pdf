import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, radius } from '../../core/theme/theme';

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
            width: (value + '%') as any,
            height: '100%',
            backgroundColor: value === 100 ? theme.success : tint,
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  value: { fontSize: 12, fontWeight: '800' },
  track: { width: '100%', overflow: 'hidden' },
});
