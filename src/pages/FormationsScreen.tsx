import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, radius } from '../core/theme/theme';
import { SearchBar, LoadingState, MessageState } from '../components';
import { UserAvatar } from '../components/UserAvatar';
import { FormationCard } from '../components/FormationCard';
import { formationStore, useFormationStore } from '../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import { useAuthStore } from '../core/state/auth.store';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackScreenProps<RootStackParamList, 'Tabs'>['navigation'] };

export function FormationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const state = useFormationStore();
  const auth = useAuthStore();
  useProgressionStore();

  useEffect(() => {
    if (state.status === 'idle') void formationStore.load();
  }, [state.status]);

  const items = useMemo(() => formationStore.filtered(), [state.items, state.query]);

  const globalPercent = useMemo(() => {
    const totalPages = state.items.reduce((sum, f) => sum + f.totalPages, 0);
    const read = progressionStore.pagesReadIn(() => true);
    return totalPages ? Math.round((read / totalPages) * 100) : 0;
  }, [state.items, progressionStore.state().documents]);

  const openFormation = useCallback(
    (formationId: string) => {
      formationStore.select(formationId);
      navigation.navigate('Levels', { formationId });
    },
    [navigation],
  );

  const firstName = auth.user?.firstName ?? '';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <FlatList
        data={state.status === 'loading' ? [] : items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => void formationStore.load({ refresh: true })}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hello, { color: theme.textMuted }]}>Bonjour {firstName} 👋</Text>
                <Text style={[styles.title, { color: theme.text }]}>Mes formations</Text>
              </View>
              <UserAvatar
                firstName={auth.user?.firstName}
                lastName={auth.user?.lastName}
                color={auth.user?.avatarColor ?? theme.primary}
                size={44}
                borderRadius={16}
                fontSize={15}
                onPress={() => navigation.navigate('ProfileTab' as never)}
              />
            </View>

            {state.status === 'success' && state.items.length > 0 ? (
              <View style={[styles.banner, { backgroundColor: theme.primary }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.bannerLabel}>PROGRESSION GLOBALE</Text>
                  <Text style={styles.bannerValue}>{globalPercent} % du catalogue parcouru</Text>
                  <Text style={styles.bannerHint}>
                    {state.items.length} formations • {state.items.reduce((s, f) => s + f.documentsCount, 0)} documents
                  </Text>
                </View>
                <View style={styles.bannerCircle}>
                  <Text style={styles.bannerCircleText}>{globalPercent}%</Text>
                </View>
              </View>
            ) : null}

            <SearchBar value={state.query} onChange={(value) => formationStore.setQuery(value)} />
          </View>
        }
        ListEmptyComponent={
          state.status === 'loading' ? (
            <LoadingState count={3} label={'Chargement des formations\u2026'} />
          ) : state.status === 'error' ? (
            <MessageState
              icon={'cloud-offline-outline'}
              tone={'danger'}
              title={'Chargement impossible'}
              message={state.error?.message ?? 'Une erreur est survenue.'}
              actionLabel={'R\u00e9essayer'}
              onAction={() => void formationStore.load()}
            />
          ) : state.query ? (
            <MessageState
              icon={'search-outline'}
              title={'Aucun r\u00e9sultat'}
              message={`Aucune formation ne correspond \u00e0 \u00ab ${state.query} \u00bb.`}
              actionLabel={'Effacer la recherche'}
              onAction={() => formationStore.setQuery('')}
            />
          ) : (
            <MessageState
              icon={'library-outline'}
              title={'Aucune formation attribu\u00e9e'}
              message={'Votre responsable de formation ne vous a encore assign\u00e9 aucun parcours.'}
              actionLabel={'Actualiser'}
              onAction={() => void formationStore.load({ refresh: true })}
            />
          )
        }
        renderItem={({ item, index }) => (
          <FormationCard
            formation={item}
            index={index}
            percent={progressionStore.formationPercent(item.id, item.totalPages)}
            onPress={() => openFormation(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hello: { fontSize: 13.5, fontWeight: '600' },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.6 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.md, borderRadius: radius.lg },
  bannerLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  bannerValue: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  bannerHint: { color: 'rgba(255,255,255,0.78)', fontSize: 12 },
  bannerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCircleText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
