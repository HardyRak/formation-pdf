import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './Chip.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../core/theme/theme';

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  solid?: boolean;
}

export function Chip({ label, icon, color, solid = false }: Props) {
  const theme = useTheme();
  const tint = color ?? theme.textMuted;
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: solid ? tint : tint + (theme.mode === 'dark' ? '2B' : '16'),
          borderColor: solid ? tint : 'transparent',
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={solid ? '#fff' : tint} /> : null}
      <Text style={[styles.label, { color: solid ? '#fff' : tint }]}>{label}</Text>
    </View>
  );
}

