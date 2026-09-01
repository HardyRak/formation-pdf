import React from 'react';
import { Pressable, ViewStyle, PressableProps } from 'react-native';
import { styles } from './AnimatedCard.styles';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, radius, spacing, shadow } from '../core/theme/theme';
import { OPACITY, SCALE } from '../core/theme/design-tokens';

interface Props {
  index?: number;
  elevation?: number;
  borderColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Carte de liste animée réutilisable.
 * Applique FadeInDown décalé, fond de carte, ombre et état pressé cohérent.
 */
export function AnimatedCard({
  index = 0,
  elevation = 3,
  borderColor,
  onPress,
  accessibilityLabel,
  accessibilityRole,
  children,
  style,
}: Props) {
  const theme = useTheme();
  const border = borderColor ?? theme.border;
  const maxDelay = 6;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, maxDelay) * 60).duration(340)}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? 'button'}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: border,
            opacity: pressed ? OPACITY.cardPressed : 1,
            transform: [{ scale: pressed ? SCALE.pressed : 1 }],
          },
          shadow(elevation),
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

