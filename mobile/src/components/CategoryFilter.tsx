import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { styles } from './CategoryFilter.styles';
import { useTheme } from '../core/theme/theme';
import type { FormationCategory } from '../core/models';

interface Props {
  categories: FormationCategory[];
  /** Catégorie sélectionnée ; `null` = toutes les formations. */
  value: string | null;
  onChange: (category: string | null) => void;
  allLabel?: string;
}

/** Filtre horizontal par catégorie (le filtrage réel est fait par l'API). */
export function CategoryFilter({ categories, value, onChange, allLabel = 'Toutes' }: Props) {
  const theme = useTheme();

  if (categories.length === 0) return null;

  const renderChip = (label: string, selected: boolean, count: number | null, next: string | null) => (
    <Pressable
      key={next ?? '__all__'}
      onPress={() => onChange(next)}
      accessibilityRole={'button'}
      accessibilityState={{ selected }}
      accessibilityLabel={`Filtrer par ${label}`}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? '#fff' : theme.textMuted }]}>{label}</Text>
      {count !== null ? (
        <Text style={[styles.count, { color: selected ? 'rgba(255,255,255,0.8)' : theme.textFaint }]}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );

  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps={'handled'}
    >
      {renderChip(allLabel, value === null, total, null)}
      {categories.map((category) =>
        renderChip(category.name, value === category.name, category.count, category.name),
      )}
    </ScrollView>
  );
}
