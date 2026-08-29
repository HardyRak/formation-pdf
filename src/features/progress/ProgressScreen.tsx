import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, spacing, radius, shadow } from '../../core/theme/theme';
import { ProgressBar } from '../../ui/components/ProgressBar';
import { MessageState } from '../../ui/components/StateViews';
import { formationStore, useFormationStore } from '../../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../../core/state/progression.store';
import { catalogTitleFor } from './document-title';

export function ProgressScreen({ navigation }: any) {
  const theme = useTheme();
  const formations = useFormationStore();
  const progression = useProgressionStore();

  useEffect(() => {
    if (formations.status === 'idle') void formationStore.load();
  }, [formations.status]);

  const entries = useMemo(() => Object.values(progression.documents), [progression.documents]);
  const totalPagesRead = entries.reduce((sum, entry) => sum + entry.pagesRead.length, 0);
  const completed = entries.filter((entry) => entry.completed).length;
  const inProgress = entries.length - completed;
  const recent = useMemo(() => progressionStore.recentDocuments(4), [progression.documents]);

  const globalPercent = useMemo(() => {
    const total = formations.items.reduce((sum, f) => sum + f.totalPages, 0);
    return total ? Math.round((totalPagesRead / total) * 100) : 0;
  }, [formations.items, totalPagesRead]);

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      progressionStore.resetAll();
      return;
    }
    Alert.alert(
      'R\u00e9initialiser la progression',
      'Toutes vos positions de lecture seront effac\u00e9es. Cette action est irr\u00e9versible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'R\u00e9initialiser', style: 'destructive', onPress: () => progressionStore.resetAll() },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Ma progression</Text>

        <Animated.View
          entering={FadeInDown.duration(340)}
          style={[styles.heroCard, { backgroundColor: theme.primary }, shadow(8)]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.heroLabel}>AVANCEMENT GLOBAL</Text>
            <Text style={styles.heroValue}>{globalPercent} %</Text>
            <Text style={styles.heroHint}>{totalPagesRead} pages lues au total</Text>
          </View>
          <View style={styles.heroStats}>
            <HeroStat value={completed} label={'termin\u00e9s'} />
            <HeroStat value={inProgress} label={'en cours'} />
          </View>
        </Animated.View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Par formation</Text>
        {formations.items.length === 0 ? (
          <MessageState
            icon={'stats-chart-outline'}
            title={'Pas encore de donn\u00e9es'}
            message={'Ouvrez une formation pour commencer \u00e0 suivre votre progression.'}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {formations.items.map((formation, index) => {
              const percent = progressionStore.formationPercent(formation.id, formation.totalPages);
              return (
                <Animated.View key={formation.id} entering={FadeInDown.delay(index * 60)}>
                  <Pressable
                    onPress={() => navigation.navigate('Levels', { formationId: formation.id })}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.92 : 1 },
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: formation.color + (theme.mode === 'dark' ? '2E' : '18') }]}>
                      <Ionicons name={formation.icon as any} size={19} color={formation.color} />
                    </View>
                    <View style={{ flex: 1, gap: 7 }}>
                      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                        {formation.name}
                      </Text>
                      <ProgressBar percent={percent} color={formation.color} height={6} />
                    </View>
                    <Text style={[styles.rowValue, { color: percent === 100 ? theme.success : theme.textMuted }]}>
                      {percent}%
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Reprendre la lecture</Text>
        {recent.length === 0 ? (
          <MessageState
            icon={'book-outline'}
            title={'Aucune lecture en cours'}
            message={'Vos derniers documents consult\u00e9s appara\u00eetront ici pour reprendre en un geste.'}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {recent.map((entry) => (
              <Pressable
                key={entry.documentId}
                onPress={() => navigation.navigate('Reader', { documentId: entry.documentId })}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.92 : 1 },
                ]}
              >
                <View style={[styles.rowIcon, { backgroundColor: theme.danger + (theme.mode === 'dark' ? '26' : '14') }]}>
                  <Ionicons name={'document-text'} size={19} color={theme.danger} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                    {catalogTitleFor(entry.documentId)}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.textFaint }]}>
                    Page {entry.lastPage} / {entry.pageCount} • {entry.percent}% lu
                  </Text>
                </View>
                <Ionicons name={'play-circle'} size={26} color={theme.primary} />
              </Pressable>
            ))}
          </View>
        )}

        {entries.length > 0 ? (
          <Pressable onPress={confirmReset} style={styles.resetBtn}>
            <Ionicons name={'trash-outline'} size={15} color={theme.danger} />
            <Text style={[styles.resetText, { color: theme.danger }]}>Réinitialiser ma progression</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.6 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.lg, borderRadius: radius.lg },
  heroLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  heroHint: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5 },
  heroStats: { gap: 10 },
  heroStat: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 82 },
  heroStatValue: { color: '#fff', fontSize: 19, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14.5, fontWeight: '700' },
  rowMeta: { fontSize: 12, fontWeight: '600' },
  rowValue: { fontSize: 13.5, fontWeight: '800', minWidth: 42, textAlign: 'right' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  resetText: { fontSize: 13.5, fontWeight: '700' },
});
