import React, { useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { styles } from './LevelsScreen.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing } from '../core/theme/theme';
import { ScreenHeader, ProgressBar, LoadingState, MessageState, AnimatedCard, SummaryCard } from '../components';
import { levelStore, useLevelStore } from '../core/state/level.store';
import { formationStore, useFormationStore } from '../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import { useAuthStore } from '../core/state/auth.store';
import { getAccessDeniedMessage } from '../core/security/access';
import { hasLevelAccess, hasFormationAccess, useAccessStore } from '../core/state/access.store';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>;

export function LevelsScreen({ route, navigation }: Props) {
  const { formationId } = route.params;
  const theme = useTheme();
  const state = useLevelStore();
  const auth = useAuthStore();
  useAccessStore();
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

  const formationHasAccess = hasFormationAccess(auth.user?.id, formationId);

  const handleLevelPress = (levelId: string, levelName: string, order: number) => {
    const hasAccess = hasLevelAccess(auth.user?.id, formationId, levelId);
    if (!hasAccess) {
      const isFormationLocked = !formationHasAccess;
      Alert.alert(
        isFormationLocked ? 'Formation verrouillée 🔒' : 'Niveau verrouillé 🔒',
        isFormationLocked ? getAccessDeniedMessage('formation') : getAccessDeniedMessage('level'),
        [
          { text: 'Compris', style: 'default' },
          { text: 'Voir profil', onPress: () => (navigation as any).navigate('Tabs', { screen: 'ProfileTab' }) },
        ],
      );
      return;
    }
    levelStore.select(levelId);
    navigation.navigate('Documents', { levelId, formationId });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={formation?.name ?? 'Formation'}
          subtitle={formation?.category ?? 'Parcours'}
          onBack={() => navigation.goBack()}
          right={
            !formationHasAccess ? (
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.textFaint + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={'lock-closed'} size={18} color={theme.textFaint} />
              </View>
            ) : undefined
          }
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
              color={formationHasAccess ? accent : theme.textFaint}
              progressLabel={formationHasAccess ? 'Progression de la formation' : 'Accès restreint'}
              elevation={4}
            >
              <View style={styles.summaryMeta}>
                <SummaryItem icon={'layers-outline'} label={`${formation.levelsCount} niveaux`} color={formationHasAccess ? accent : theme.textFaint} />
                <SummaryItem icon={'document-text-outline'} label={`${formation.documentsCount} documents`} color={formationHasAccess ? accent : theme.textFaint} />
                <SummaryItem icon={'reader-outline'} label={`${formation.totalPages} pages`} color={formationHasAccess ? accent : theme.textFaint} />
              </View>
              {!formationHasAccess ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 10, backgroundColor: theme.textFaint + '12', borderRadius: 12 }}>
                  <Ionicons name={'lock-closed'} size={16} color={theme.textFaint} />
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.textFaint, flex: 1 }}>
                    Vous n'avez pas accès à cette formation. {levels.length} niveaux affichés mais verrouillés.
                  </Text>
                </View>
              ) : null}
            </SummaryCard>
          ) : null
        }
        ListEmptyComponent={
          state.status === 'loading' ? (
            <LoadingState count={3} label={'Chargement des niveaux…'} />
          ) : state.status === 'error' ? (
            <MessageState
              icon={'cloud-offline-outline'}
              tone={'danger'}
              title={'Niveaux indisponibles'}
              message={state.error?.message ?? 'Erreur inattendue.'}
              actionLabel={'Réessayer'}
              onAction={() => void levelStore.load(formationId)}
            />
          ) : (
            <MessageState
              icon={'layers-outline'}
              title={'Aucun niveau'}
              message={'Cette formation ne contient pas encore de niveau publié.'}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => {
          const percent = progressionStore.levelPercent(item.id, item.totalPages);
          const isNext = item.id === nextLevelId && formationHasAccess;
          const hasAccess = hasLevelAccess(auth.user?.id, formationId, item.id);
          const locked = !hasAccess;

          return (
            <AnimatedCard
              index={index}
              elevation={3}
              borderColor={locked ? theme.border : isNext ? accent + '66' : undefined}
              onPress={() => handleLevelPress(item.id, item.name, item.order)}
              accessibilityLabel={`Niveau ${item.order} : ${item.name}${locked ? ' - verrouillé' : ''}`}
              style={locked ? { opacity: 0.62 } : undefined}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.step,
                    {
                      backgroundColor: locked ? theme.textFaint + '22' : percent === 100 ? theme.success : accent + (theme.mode === 'dark' ? '2E' : '18'),
                    },
                  ]}
                >
                  {locked ? (
                    <Ionicons name={'lock-closed'} size={18} color={theme.textFaint} />
                  ) : percent === 100 ? (
                    <Ionicons name={'checkmark'} size={20} color={'#fff'} />
                  ) : (
                    <Text style={[styles.stepText, { color: accent }]}>{item.order}</Text>
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.cardTitle, { color: locked ? theme.textFaint : theme.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {locked ? <Ionicons name={'lock-closed'} size={14} color={theme.textFaint} /> : null}
                  </View>
                  <Text style={[styles.cardMeta, { color: locked ? theme.textFaint : theme.textFaint }]}>
                    {item.documentsCount} document{item.documentsCount > 1 ? 's' : ''} • {item.totalPages} pages {locked ? '• Verrouillé 🔒' : ''}
                  </Text>
                </View>
                {locked ? (
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.textFaint + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={'lock-closed'} size={16} color={theme.textFaint} />
                  </View>
                ) : isNext ? (
                  <View style={[styles.nextTag, { backgroundColor: accent }]}>
                    <Text style={styles.nextTagText}>À SUIVRE</Text>
                  </View>
                ) : (
                  <Ionicons name={'chevron-forward'} size={19} color={theme.textFaint} />
                )}
              </View>
              <Text style={[styles.cardDesc, { color: locked ? theme.textFaint : theme.textMuted }]} numberOfLines={2}>
                {item.description}
              </Text>
              {locked ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                  <Ionicons name={'shield-outline'} size={12} color={theme.textFaint} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.textFaint }}>Accès restreint</Text>
                </View>
              ) : (
                <ProgressBar percent={percent} color={accent} showLabel />
              )}
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
