import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../core/theme/theme';

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
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  back: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  subtitle: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
});
