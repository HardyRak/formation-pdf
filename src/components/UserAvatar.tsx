import React from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';
import { styles } from './UserAvatar.styles';
import { useTheme } from '../core/theme/theme';

interface Props {
  firstName?: string | null;
  lastName?: string | null;
  color?: string;
  size?: number;
  borderRadius?: number;
  fontSize?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function UserAvatar({
  firstName,
  lastName,
  color,
  size = 44,
  borderRadius,
  fontSize,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const theme = useTheme();
  const bg = color ?? theme.primary;
  const radius = borderRadius ?? Math.round(size * 0.36);
  const fSize = fontSize ?? Math.round(size * 0.34);
  const initials = ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?';

  const content = (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: radius, backgroundColor: bg }, style]}
    >
      <Text style={[styles.text, { fontSize: fSize }]}>{initials}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel ?? 'Profil'}>
        {content}
      </Pressable>
    );
  }
  return content;
}

