import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, radius } from '../core/theme/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ProgressBar } from '../components/ProgressBar';
import { LoadingState, MessageState } from '../components/StateViews';
import { Chip } from '../components/Chip';
import { AnimatedCard } from '../components/AnimatedCard';
import { SummaryCard } from '../components/SummaryCard';
import { documentStore, useDocumentStore } from '../core/state/document.store';
import { levelStore, useLevelStore } from '../core/state/level.store';
import { formationStore } from '../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Documents'>;

export function DocumentsScreen({ route, navigation }: Props) {
  const { levelId, formationId } = route.params;
  const theme = useTheme();
  const state = useDocumentStore();
  useLevelStore();
  useProgressionStore();

  const level = levelStore.byId(levelId);
  const formation = formationStore.byId(formationId);
  const accent = formation?.color ?? theme.primary;

  useEffect(() => {
    if (state.levelId !== levelId || state.status === 'idle') {
      void documentStore.load(levelId);
    }
  }, [levelId, state.levelId, state.status]);

  const documents = state.status === 'success' ? documentStore.ordered() : [];
  const levelPercent = level ? progressionStore.levelPercent(level.id, level.totalPages) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={level?.name ?? 'Documents'}
          subtitle={formation?.name ?? 'Niveau'}
          onBack={() => navigation.goBack()}
        />
      </View>

      <FlatList
        data={state.status === 'loading' ? [] : documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => void documentStore.load(levelId, { refresh: true })}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          level ? (
            <SummaryCard
              description={level.description}
              percent={levelPercent}
              color={accent}
              progressLabel={'Progression du niveau'}
            />
          ) : null
        }
        ListEmptyComponent={
          state.status === 'loading' ? (
            <LoadingState count={3} label={'R\u00e9cup\u00e9ration des documents\u2026'} />
          ) : state.status === 'error' ? (
            <MessageState
              icon={'cloud-offline-outline'}
              tone={'danger'}
              title={'Documents indisponibles'}
              message={state.error?.message ?? 'Erreur inattendue.'}
              actionLabel={'R\u00e9essayer'}
              onAction={() => void documentStore.load(levelId)}
            />
          ) : (
            <MessageState
              icon={'document-outline'}
              title={'Aucun document'}
              message={'Ce niveau ne contient aucun support de formation pour le moment.'}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => (
          <DocumentRow
            item={item}
            index={index}
            accent={accent}
            onPress={() => navigation.navigate('Reader', { documentId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function DocumentRow({
  item,
  index,
  accent,
  onPress,
}: {
  item: { id: string; title: string; description: string; pageCount: number; sizeKb: number };
  index: number;
  accent: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const progress = progressionStore.documentProgress(item.id);
  const percent = progress?.percent ?? 0;
  const status: 'new' | 'done' | 'reading' = !progress ? 'new' : progress.completed ? 'done' : 'reading';

  return (
    <AnimatedCard
      index={index}
      elevation={3}
      onPress={onPress}
      accessibilityLabel={`Ouvrir ${item.title}`}
    >
      <View style={styles.cardTop}>
        <View style={[styles.pdfIcon, { backgroundColor: theme.danger + (theme.mode === 'dark' ? '26' : '14') }]}>
          <Ionicons name={'document-text'} size={23} color={theme.danger} />
          <Text style={[styles.pdfLabel, { color: theme.danger }]}>PDF</Text>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.chips}>
            {status === 'done' ? (
              <Chip label={'Termin\u00e9'} icon={'checkmark-circle'} color={theme.success} />
            ) : status === 'reading' ? (
              <Chip
                label={`En cours \u2022 p. ${progress?.lastPage}/${item.pageCount}`}
                icon={'book-outline'}
                color={accent}
              />
            ) : (
              <Chip label={'Non lu'} icon={'ellipse-outline'} color={theme.textFaint} />
            )}
            <Chip label={`${item.pageCount} pages`} icon={'reader-outline'} color={theme.textMuted} />
          </View>
        </View>
      </View>

      <Text style={[styles.cardDesc, { color: theme.textMuted }]} numberOfLines={2}>
        {item.description}
      </Text>

      <ProgressBar percent={percent} color={accent} height={6} />

      <View style={[styles.actionRow, { borderColor: theme.border }]}>
        <Text style={[styles.sizeText, { color: theme.textFaint }]}>
          {(item.sizeKb / 1024).toFixed(1)} Mo • Lecture sécurisée
        </Text>
        <View style={[styles.openBtn, { backgroundColor: accent }]}>
          <Ionicons name={status === 'reading' ? 'play' : 'book-outline'} size={13} color={'#fff'} />
          <Text style={styles.openBtnText}>
            {status === 'reading' ? 'Reprendre' : status === 'done' ? 'Relire' : 'Ouvrir'}
          </Text>
        </View>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: 4, paddingBottom: spacing.xxl },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  pdfIcon: { width: 50, height: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 1 },
  pdfLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 11, borderTopWidth: 1 },
  sizeText: { fontSize: 11.5, fontWeight: '600' },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill },
  openBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
});
