import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { styles } from './ProgressScreen.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, radius, shadow } from '../core/theme/theme';
import { ProgressBar, MessageState } from '../components';
import { formationStore, useFormationStore } from '../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import type { RootStackParamList } from '../navigation/types';
import { catalogTitleFor } from '../utils/document-title';

type Props = { navigation: NativeStackScreenProps<RootStackParamList, 'Tabs'>['navigation'] };

export function ProgressScreen({ navigation }: Props) {
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
      void progressionStore.resetAll();
      return;
    }
    Alert.alert(
      'R\u00e9initialiser la progression',
      'Toutes vos positions de lecture seront effac\u00e9es de cet appareil et du serveur. Cette action est irr\u00e9versible.',
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

        <SyncBadge />

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
                      <Ionicons name={formation.icon} size={19} color={formation.color} />
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

/**
 * État de la sauvegarde en base (backend) : synchronisé, en cours,
 * ou modifications en attente (hors ligne). La lecture reste toujours
 * possible : seul l'envoi diffère.
 */
function SyncBadge() {
  const theme = useTheme();
  const progression = useProgressionStore();
  const { syncStatus, pending, lastSyncAt, syncError } = progression;
  const pendingCount = pending.length;

  let icon: keyof typeof Ionicons.glyphMap = 'cloud-done-outline';
  let color = theme.success;
  let label = 'Progression sauvegard\u00e9e en base';

  if (syncStatus === 'syncing') {
    icon = 'cloud-upload-outline';
    color = theme.primary;
    label = 'Synchronisation en cours\u2026';
  } else if (pendingCount > 0) {
    icon = 'cloud-offline-outline';
    color = theme.warning;
    label = `Hors ligne \u2022 ${pendingCount} modification${pendingCount > 1 ? 's' : ''} en attente`;
  } else if (syncStatus === 'error' || !lastSyncAt) {
    icon = 'cloud-offline-outline';
    color = theme.warning;
    label = syncError ? `Sauvegarde locale \u2022 ${syncError}` : 'Sauvegarde locale';
  }

  return (
    <View style={[styles.syncBadge, { borderColor: color + '55', backgroundColor: color + '14' }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.syncBadgeText, { color: theme.text }]} numberOfLines={1}>
        {label}
        {syncStatus === 'idle' && lastSyncAt && pendingCount === 0
          ? ` \u2022 ${relativeTime(lastSyncAt)}`
          : ''}
      </Text>
    </View>
  );
}

function relativeTime(timestamp: number): string {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) return 'il y a quelques secondes';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

