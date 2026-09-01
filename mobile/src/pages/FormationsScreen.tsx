import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { styles } from './FormationsScreen.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing } from '../core/theme/theme';
import { SearchBar, LoadingState, MessageState } from '../components';
import { UserAvatar } from '../components/UserAvatar';
import { FormationCard } from '../components/FormationCard';
import { formationStore, useFormationStore } from '../core/state/formation.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import { useAuthStore } from '../core/state/auth.store';
import { getAccessDeniedMessage } from '../core/security/access';
import { hasFormationAccess, useAccessStore } from '../core/state/access.store';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackScreenProps<RootStackParamList, 'Tabs'>['navigation'] };

export function FormationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const state = useFormationStore();
  const auth = useAuthStore();
  const access = useAccessStore();
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

  const accessibleCount = useMemo(() => {
    return state.items.filter((f) => hasFormationAccess(auth.user?.id, f.id)).length;
  }, [state.items, auth.user?.id, access]);

  const lockedCount = state.items.length - accessibleCount;

  const openFormation = useCallback(
    (formationId: string) => {
      const hasAccess = hasFormationAccess(auth.user?.id, formationId);
      if (!hasAccess) {
        Alert.alert(
          'Accès restreint 🔒',
          getAccessDeniedMessage('formation'),
          [
            { text: 'Compris', style: 'default' },
            { text: 'Voir profil', onPress: () => (navigation as any).navigate('Tabs', { screen: 'ProfileTab' }) },
          ],
        );
        return;
      }
      formationStore.select(formationId);
      navigation.navigate('Levels', { formationId });
    },
    [navigation, auth.user?.id],
  );

  const goToProfile = useCallback(() => {
    (navigation as any).navigate('Tabs', { screen: 'ProfileTab' });
  }, [navigation]);

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

            {state.status === 'success' && state.items.length > 0 ? (
              <View style={[styles.banner, { backgroundColor: theme.primary }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.bannerLabel}>PROGRESSION GLOBALE</Text>
                  <Text style={styles.bannerValue}>{globalPercent} % du catalogue parcouru</Text>
                  <Text style={styles.bannerHint}>
                    {accessibleCount}/{state.items.length} formations accessibles • {state.items.reduce((s, f) => s + f.documentsCount, 0)} documents
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
          ) : state.query ? (
            <MessageState
              icon={'search-outline'}
              title={'Aucun résultat'}
              message={`Aucune formation ne correspond à « ${state.query} ».`}
              actionLabel={'Effacer la recherche'}
              onAction={() => formationStore.setQuery('')}
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
