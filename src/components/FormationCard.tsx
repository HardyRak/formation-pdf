import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Formation } from '../core/models';
import { useTheme, radius, spacing, shadow } from '../core/theme/theme';
import { ProgressBar } from './ProgressBar';
import { Chip } from './Chip';

interface Props {
  formation: Formation;
  percent: number;
  index: number;
  onPress: () => void;
}

export function FormationCard({ formation, percent, index, onPress }: Props) {
  const theme = useTheme();
  const done = percent === 100;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).duration(360)}>
      <Pressable
        onPress={onPress}
        accessibilityRole={'button'}
        accessibilityLabel={`Formation ${formation.name}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
          shadow(5),
        ]}
      >
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: formation.color + (theme.mode === 'dark' ? '2E' : '18') }]}>
            <Ionicons name={formation.icon} size={26} color={formation.color} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
                {formation.name}
              </Text>
              {done ? <Ionicons name={'checkmark-circle'} size={19} color={theme.success} /> : null}
            </View>
            <View style={styles.chips}>
              <Chip label={formation.category} color={formation.color} />
              {formation.mandatory ? <Chip label={'Obligatoire'} icon={'alert-circle'} color={theme.warning} /> : null}
            </View>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={2}>
          {formation.description}
        </Text>

        <View style={[styles.metaRow, { borderColor: theme.border }]}>
          <Meta icon={'layers-outline'} value={`${formation.levelsCount} niveaux`} />
          <View style={[styles.sep, { backgroundColor: theme.border }]} />
          <Meta icon={'document-text-outline'} value={`${formation.documentsCount} docs`} />
          <View style={[styles.sep, { backgroundColor: theme.border }]} />
          <Meta icon={'time-outline'} value={`${Math.round(formation.durationMinutes / 60)} h`} />
        </View>

        <ProgressBar percent={percent} color={formation.color} showLabel label={percent > 0 ? 'Progression' : 'Non commenc\u00e9e'} />
      </Pressable>
    </Animated.View>
  );
}

function Meta({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.textFaint} />
      <Text style={[styles.metaText, { color: theme.textMuted }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 12 },
  top: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  icon: { width: 54, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  description: { fontSize: 13.5, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderBottomWidth: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, fontWeight: '600' },
  sep: { width: 1, height: 12 },
});
