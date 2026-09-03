import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from './FormationCard.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Formation } from '../core/models';
import { useTheme, shadow } from '../core/theme/theme';
import { OPACITY, SCALE } from '../core/theme/design-tokens';
import { ProgressBar } from './ProgressBar';
import { Chip } from './Chip';

interface Props {
  formation: Formation;
  percent: number;
  index: number;
  locked?: boolean;
  onPress: () => void;
}

export function FormationCard({ formation, percent, index, locked = false, onPress }: Props) {
  const theme = useTheme();
  const done = percent === 100 && !locked;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).duration(360)}>
      <Pressable
        onPress={onPress}
        accessibilityRole={'button'}
        accessibilityLabel={`Formation ${formation.name}${locked ? ' - verrouillée' : ''}`}
        style={({ pressed }) => [
          styles.card,
          locked ? styles.cardLocked : null,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed && !locked ? OPACITY.cardPressed : locked ? 0.62 : 1, transform: [{ scale: pressed && !locked ? SCALE.pressed : 1 }] },
          shadow(5),
        ]}
      >
        {locked ? (
          <View style={[styles.lockBadge, { backgroundColor: theme.textFaint + '22' }]}>
            <Ionicons name={'lock-closed'} size={16} color={theme.textFaint} />
          </View>
        ) : null}
        <View style={styles.top}>
          <View style={[styles.icon, locked ? styles.iconLocked : null, { backgroundColor: formation.color + (theme.mode === 'dark' ? '2E' : '18') }]}>
            <Ionicons name={locked ? 'lock-closed' : formation.icon} size={26} color={locked ? theme.textFaint : formation.color} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, locked ? styles.nameLocked : null, { color: locked ? theme.textFaint : theme.text }]} numberOfLines={2}>
                {formation.name}
              </Text>
              {done ? <Ionicons name={'checkmark-circle'} size={19} color={theme.success} /> : null}
              {locked ? <Ionicons name={'lock-closed'} size={18} color={theme.textFaint} style={{ marginLeft: 4 }} /> : null}
            </View>
            <View style={styles.chips}>
              <Chip label={formation.category} color={locked ? theme.textFaint : formation.color} />
              {formation.mandatory ? <Chip label={'Obligatoire'} icon={'alert-circle'} color={locked ? theme.textFaint : theme.warning} /> : null}
              {locked ? <Chip label={'Accès restreint'} icon={'lock-closed'} color={theme.textFaint} /> : null}
            </View>
          </View>
        </View>

        <Text style={[styles.description, locked ? styles.descriptionLocked : null, { color: locked ? theme.textFaint : theme.textMuted }]} numberOfLines={2}>
          {formation.description}
        </Text>

        <View style={[styles.metaRow, { borderColor: theme.border }]}>
          <Meta icon={'layers-outline'} value={`${formation.levelsCount} niveaux`} locked={locked} />
          <View style={[styles.sep, { backgroundColor: theme.border }]} />
          <Meta icon={'document-text-outline'} value={`${formation.documentsCount} docs`} locked={locked} />
          <View style={[styles.sep, { backgroundColor: theme.border }]} />
          <Meta icon={'time-outline'} value={`${Math.round(formation.durationMinutes / 60)} h`} locked={locked} />
        </View>

        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 }}>
            <Ionicons name={'shield-outline'} size={14} color={theme.textFaint} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textFaint }}>Accès restreint — contactez votre responsable</Text>
          </View>
        ) : (
          <ProgressBar percent={percent} color={formation.color} showLabel label={percent > 0 ? 'Progression' : 'Non commencée'} />
        )}
      </Pressable>
    </Animated.View>
  );
}

function Meta({ icon, value, locked = false }: { icon: keyof typeof Ionicons.glyphMap; value: string; locked?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.textFaint} />
      <Text style={[styles.metaText, { color: locked ? theme.textFaint : theme.textMuted }]}>{value}</Text>
    </View>
  );
}
