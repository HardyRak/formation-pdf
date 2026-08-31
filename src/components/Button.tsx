import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, radius, shadow } from '../core/theme/theme';
import { OPACITY, SCALE } from '../core/theme/design-tokens';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
}

export function Button({ label, onPress, loading, disabled, icon, variant = 'primary', style }: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg = variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger + '18' : 'transparent';
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? theme.danger : theme.primary;

  return (
    <Pressable
      accessibilityRole={'button'}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? shadow(4) : null,
        {
          backgroundColor: bg,
          borderColor: variant === 'ghost' ? theme.border : 'transparent',
          opacity: isDisabled ? OPACITY.disabled : pressed ? OPACITY.buttonPressed : 1,
          transform: [{ scale: pressed && !isDisabled ? SCALE.buttonPressed : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size={'small'} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
