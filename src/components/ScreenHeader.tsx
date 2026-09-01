import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from './ScreenHeader.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../core/theme/theme';
import { OPACITY } from '../core/theme/design-tokens';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, right }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityLabel={'Retour'}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? OPACITY.iconPressed : 1 },
          ]}
        >
          <Ionicons name={'chevron-back'} size={21} color={theme.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.primary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

