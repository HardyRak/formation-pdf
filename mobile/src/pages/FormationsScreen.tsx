import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { styles } from './FormationsScreen.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing } from '../core/theme/theme';
import { SearchBar, LoadingState, MessageState, CategoryFilter } from '../components';
import { UserAvatar } from '../components/UserAvatar';
import { FormationCard } from '../components/FormationCard';
import { formationStore, useFormationStore } from '../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import { useAuthStore } from '../core/state/auth.store';
import { hasFormationAccess, useAccessStore } from '../core/state/access.store';
import { promptLockedAccess } from '../utils/access-alert';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackScreenProps<RootStackParamList, 'Tabs'>['navigation'] };

export function FormationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const state = useFormationStore();
  const auth = useAuthStore();
  const access = useAccessStore();
  const progression = useProgressionStore();

  useEffect(() => {
    if (state.status === 'idle') void formationStore.load();
  }, [state.status]);

  // Le bandeau de synthèse porte sur TOUT le catalogue, pas sur la page
  // affichée : il est agrégé par tranches en arrière-plan.
  useEffect(() => {
    void formationStore.loadCatalog();
  }, []);

  const catalog = state.catalog;

  const globalPercent = useMemo(() => {
    const totalPages = catalog.reduce((sum, f) => sum + f.totalPages, 0);
    const read = Object.values(progression.documents).reduce((sum, doc) => sum + doc.pagesRead.length, 0);
    return totalPages ? Math.round((read / totalPages) * 100) : 0;
  }, [catalog, progression.documents]);

  const accessibleCount = useMemo(
    () => catalog.filter((f) => hasFormationAccess(auth.user?.id, f.id)).length,
    [catalog, auth.user?.id, access],
  );

  const lockedCount = catalog.length - accessibleCount;
  const isFiltering = state.query.trim().length > 0 || state.category !== null;

  const openFormation = useCallback(
    (formationId: string) => {
      const hasAccess = hasFormationAccess(auth.user?.id, formationId);
      if (!hasAccess) {
        promptLockedAccess({
          scope: 'formation',
          onSeeProfile: () => navigation.navigate('Tabs', { screen: 'ProfileTab' }),
        });
        return;
      }
      navigation.navigate('Levels', { formationId });
    },
    [navigation, auth.user?.id],
  );

  const goToProfile = useCallback(() => {
    navigation.navigate('Tabs', { screen: 'ProfileTab' });
  }, [navigation]);

  const handleEndReached = useCallback(() => {
    void formationStore.loadMore();
  }, []);

  const clearFilters = useCallback(() => {
    formationStore.setQuery('');
    formationStore.setCategory(null);
  }, []);

  const firstName = auth.user?.firstName ?? '';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <FlatList
        data={state.status === 'loading' ? [] : state.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={'handled'}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => {
              void formationStore.load({ refresh: true });
              void formationStore.loadCatalog({ refresh: true });
            }}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hello, { color: theme.textMuted }]}>Bonjour {firstName} 👋</Text>
                <Text style={[styles.title, { color: theme.text }]}>Mes formations</Text>
                {lockedCount > 0 ? (
                  <Text style={{ fontSize: 12, color: theme.textFaint, marginTop: 2 }}>
                    {accessibleCount} accessible{accessibleCount > 1 ? 's' : ''} • {lockedCount} verrouillée{lockedCount > 1 ? 's' : ''} 🔒
                  </Text>
                ) : null}
              </View>
              <UserAvatar
                firstName={auth.user?.firstName}
                lastName={auth.user?.lastName}
                color={auth.user?.avatarColor ?? theme.primary}
                size={44}
                borderRadius={16}
                fontSize={15}
                onPress={goToProfile}
              />
            </View>

            {catalog.length > 0 ? (
              <View style={[styles.banner, { backgroundColor: theme.primary }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.bannerLabel}>PROGRESSION GLOBALE</Text>
                  <Text style={styles.bannerValue}>{globalPercent} % du catalogue parcouru</Text>
                  <Text style={styles.bannerHint}>
                    {accessibleCount}/{catalog.length} formations accessibles • {catalog.reduce((s, f) => s + f.documentsCount, 0)} documents
                  </Text>
                </View>
                <View style={styles.bannerCircle}>
                  <Text style={styles.bannerCircleText}>{globalPercent}%</Text>
                </View>
              </View>
            ) : null}

            <SearchBar value={state.query} onChange={(value) => formationStore.setQuery(value)} />

            <CategoryFilter
              categories={state.categories}
              value={state.category}
              onChange={(category) => formationStore.setCategory(category)}
            />

            {state.status === 'success' && state.total > 0 ? (
              <Text style={[styles.resultCount, { color: theme.textFaint }]}>
                {state.items.length} / {state.total} formation{state.total > 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          state.status === 'loading' ? (
            <LoadingState count={3} label={'Chargement des formations…'} />
          ) : state.status === 'error' ? (
            <MessageState
              icon={'cloud-offline-outline'}
              tone={'danger'}
              title={'Chargement impossible'}
              message={state.error?.message ?? 'Une erreur est survenue.'}
              actionLabel={'Réessayer'}
              onAction={() => void formationStore.load()}
            />
          ) : isFiltering ? (
            <MessageState
              icon={'search-outline'}
              title={'Aucun résultat'}
              message={
                state.query
                  ? `Aucune formation ne correspond à « ${state.query} ».`
                  : 'Aucune formation dans cette catégorie.'
              }
              actionLabel={'Réinitialiser les filtres'}
              onAction={clearFilters}
            />
          ) : (
            <MessageState
              icon={'library-outline'}
              title={'Aucune formation attribuée'}
              message={'Votre responsable de formation ne vous a encore assigné aucun parcours.'}
              actionLabel={'Actualiser'}
              onAction={() => void formationStore.load({ refresh: true })}
            />
          )
        }
        ListFooterComponent={
          <ListFooter
            loadingMore={state.loadingMore}
            hasMore={state.hasMore}
            errorMessage={state.loadMoreError?.message ?? null}
            itemCount={state.items.length}
            onRetry={handleEndReached}
          />
        }
        renderItem={({ item, index }) => {
          const hasAccess = hasFormationAccess(auth.user?.id, item.id);
          return (
            <FormationCard
              formation={item}
              index={index}
              locked={!hasAccess}
              percent={progressionStore.formationPercent(item.id, item.totalPages)}
              onPress={() => openFormation(item.id)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

interface FooterProps {
  loadingMore: boolean;
  hasMore: boolean;
  errorMessage: string | null;
  itemCount: number;
  onRetry: () => void;
}

/** Pied de liste de l'infinite scroll : chargement, erreur ou fin de liste. */
function ListFooter({ loadingMore, hasMore, errorMessage, itemCount, onRetry }: FooterProps) {
  const theme = useTheme();

  if (loadingMore) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.footerText, { color: theme.textFaint }]}>Chargement…</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <Pressable onPress={onRetry} style={styles.footer} accessibilityRole={'button'}>
        <Text style={[styles.footerText, { color: theme.danger }]}>{errorMessage}</Text>
        <Text style={[styles.footerAction, { color: theme.primary }]}>Réessayer</Text>
      </Pressable>
    );
  }

  if (!hasMore && itemCount > 0) {
    return (
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textFaint }]}>Fin de la liste</Text>
      </View>
    );
  }

  return null;
}
