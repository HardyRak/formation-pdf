import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing } from '../core/theme/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ProgressBar } from '../components/ProgressBar';
import { LoadingState, MessageState } from '../components/StateViews';
import { AnimatedCard } from '../components/AnimatedCard';
import { SummaryCard } from '../components/SummaryCard';
import { levelStore, useLevelStore } from '../core/state/level.store';
import { formationStore, useFormationStore } from '../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>;

export function LevelsScreen({ route, navigation }: Props) {
  const { formationId } = route.params;
  const theme = useTheme();
  const state = useLevelStore();
  useFormationStore();
  useProgressionStore();

  const formation = formationStore.byId(formationId);
  const accent = formation?.color ?? theme.primary;

  useEffect(() => {
    if (state.formationId !== formationId || state.status === 'idle') {
      void levelStore.load(formationId);
    }
  }, [formationId, state.formationId, state.status]);

  const levels = state.status === 'success' ? levelStore.ordered() : [];
  const formationPercent = formation ? progressionStore.formationPercent(formation.id, formation.totalPages) : 0;
  const nextLevelId = levels.find((level) => progressionStore.levelPercent(level.id, level.totalPages) < 100)?.id;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={formation?.name ?? 'Formation'}
          subtitle={formation?.category ?? 'Parcours'}
          onBack={() => navigation.goBack()}
        />
      </View>

      <FlatList
        data={state.status === 'loading' ? [] : levels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => void levelStore.load(formationId, { refresh: true })}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          formation ? (
            <SummaryCard
              description={formation.description}
              percent={formationPercent}
              color={accent}
              progressLabel={'Progression de la formation'}
              elevation={4}
            >
              <View style={styles.summaryMeta}>
                <SummaryItem icon={'layers-outline'} label={`${formation.levelsCount} niveaux`} color={accent} />
                <SummaryItem icon={'document-text-outline'} label={`${formation.documentsCount} documents`} color={accent} />
                <SummaryItem icon={'reader-outline'} label={`${formation.totalPages} pages`} color={accent} />
              </View>
            </SummaryCard>
          ) : null
        }
        ListEmptyComponent={
          state.status === 'loading' ? (
            <LoadingState count={3} label={'Chargement des niveaux\u2026'} />
          ) : state.status === 'error' ? (
            <MessageState
              icon={'cloud-offline-outline'}
              tone={'danger'}
              title={'Niveaux indisponibles'}
              message={state.error?.message ?? 'Erreur inattendue.'}
              actionLabel={'R\u00e9essayer'}
              onAction={() => void levelStore.load(formationId)}
            />
          ) : (
            <MessageState
              icon={'layers-outline'}
              title={'Aucun niveau'}
              message={'Cette formation ne contient pas encore de niveau publi\u00e9.'}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => {
          const percent = progressionStore.levelPercent(item.id, item.totalPages);
          const isNext = item.id === nextLevelId;
          return (
            <AnimatedCard
              index={index}
              elevation={3}
              borderColor={isNext ? accent + '66' : undefined}
              onPress={() => {
                levelStore.select(item.id);
                navigation.navigate('Documents', { levelId: item.id, formationId });
              }}
              accessibilityLabel={`Niveau ${item.order} : ${item.name}`}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.step,
                    {
                      backgroundColor: percent === 100 ? theme.success : accent + (theme.mode === 'dark' ? '2E' : '18'),
                    },
                  ]}
                >
                  {percent === 100 ? (
                    <Ionicons name={'checkmark'} size={20} color={'#fff'} />
                  ) : (
                    <Text style={[styles.stepText, { color: accent }]}>{item.order}</Text>
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.cardMeta, { color: theme.textFaint }]}>
                    {item.documentsCount} document{item.documentsCount > 1 ? 's' : ''} • {item.totalPages} pages
                  </Text>
                </View>
                {isNext ? (
                  <View style={[styles.nextTag, { backgroundColor: accent }]}>
                    <Text style={styles.nextTagText}>À SUIVRE</Text>
                  </View>
                ) : (
                  <Ionicons name={'chevron-forward'} size={19} color={theme.textFaint} />
                )}
              </View>
              <Text style={[styles.cardDesc, { color: theme.textMuted }]} numberOfLines={2}>
                {item.description}
              </Text>
              <ProgressBar percent={percent} color={accent} showLabel />
            </AnimatedCard>
          );
        }}
      />
    </SafeAreaView>
  );
}

function SummaryItem({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.summaryItemText, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: 4, paddingBottom: spacing.xxl },
  summaryMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryItemText: { fontSize: 12.5, fontWeight: '600' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 17, fontWeight: '900' },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  cardMeta: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 13.5, lineHeight: 19 },
  nextTag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  nextTagText: { color: '#fff', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
});
