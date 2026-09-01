import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, useColorScheme } from 'react-native';
import { styles } from './ProfileScreen.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, radius, shadow } from '../core/theme/theme';
import { Button } from '../components/Button';
import { UserAvatar } from '../components/UserAvatar';
import { authStore, useAuthStore } from '../core/state/auth.store';
import { progressionStore, useProgressionStore } from '../core/state/progression.store';
import { requestLogs } from '../core/api/http-client';
import { FORMATION_LABELS } from '../core/security/access';
import { getAccessibleFormations, hasFormationAccess, useAccessStore } from '../core/state/access.store';
import { formationStore, useFormationStore } from '../core/state/formation.store';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackScreenProps<RootStackParamList, 'Tabs'>['navigation'] };

export function ProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const auth = useAuthStore();
  const progression = useProgressionStore();
  const formations = useFormationStore();
  const access = useAccessStore();
  const scheme = useColorScheme();

  const expiresIn = useMemo(() => {
    if (!auth.session) return '—';
    const remaining = auth.session.expiresAt - Date.now();
    if (remaining <= 0) return 'expiré';
    return `${Math.max(1, Math.round(remaining / 60000))} min`;
  }, [auth.session]);

  const documentsTracked = Object.keys(progression.documents).length;
  const logs = requestLogs().slice(0, 5);

  const allFormations = formations.items.length > 0 ? formations.items : formationStore.state().items;

  const accessibleFormations = useMemo(() => {
    return getAccessibleFormations(auth.user?.id);
  }, [auth.user?.id, access]);

  const accessibleCount = useMemo(
    () => allFormations.filter((f) => hasFormationAccess(auth.user?.id, f.id)).length,
    [allFormations, auth.user?.id, access],
  );

  const lockedFormations = allFormations.filter((f) => !hasFormationAccess(auth.user?.id, f.id));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Mon compte</Text>

        <Animated.View
          entering={FadeInDown.duration(320)}
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, shadow(5)]}
        >
          <View style={styles.userRow}>
            <UserAvatar
              firstName={auth.user?.firstName}
              lastName={auth.user?.lastName}
              color={auth.user?.avatarColor ?? theme.primary}
              size={58}
              borderRadius={20}
              fontSize={19}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.userName, { color: theme.text }]}>
                {auth.user?.firstName} {auth.user?.lastName}
              </Text>
              <Text style={[styles.userMail, { color: theme.textMuted }]}>{auth.user?.email}</Text>
              <View style={[styles.roleTag, { backgroundColor: theme.primary + '1A' }]}>
                <Ionicons name={'briefcase-outline'} size={11} color={theme.primary} />
                <Text style={[styles.roleText, { color: theme.primary }]}>
                  {auth.user?.role === 'MANAGER' ? 'Responsable formation' : 'Apprenant'} • {auth.user?.company}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sécurité des informations 🔒</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={'shield-checkmark'} size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Accès aux formations</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                {accessibleCount}/{allFormations.length || 4} formations accessibles
              </Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            {allFormations.length > 0 ? (
              allFormations.map((f) => {
                const hasAccess = hasFormationAccess(auth.user?.id, f.id);
                return (
                  <View
                    key={f.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: radius.md,
                      backgroundColor: hasAccess ? f.color + '12' : theme.surfaceAlt,
                      borderWidth: 1,
                      borderColor: hasAccess ? f.color + '33' : theme.border,
                      opacity: hasAccess ? 1 : 0.6,
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: hasAccess ? f.color + '22' : theme.textFaint + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={hasAccess ? (f.icon as any) : 'lock-closed'} size={16} color={hasAccess ? f.color : theme.textFaint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: hasAccess ? theme.text : theme.textFaint }} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textFaint }}>{f.category} • {hasAccess ? 'Accessible' : 'Verrouillé 🔒'}</Text>
                    </View>
                    <Ionicons name={hasAccess ? 'checkmark-circle' : 'lock-closed'} size={18} color={hasAccess ? theme.success : theme.textFaint} />
                  </View>
                );
              })
            ) : (
              <>
                {accessibleFormations.filter((id) => id !== '*').map((id) => (
                  <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={'checkmark-circle'} size={16} color={theme.success} />
                    <Text style={{ fontSize: 13, color: theme.text }}>{FORMATION_LABELS[id] ?? id}</Text>
                  </View>
                ))}
                {lockedFormations.length > 0 ? (
                  <View style={{ marginTop: 4, gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textFaint, marginTop: 4 }}>Verrouillées :</Text>
                    {lockedFormations.map((f) => (
                      <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.6 }}>
                        <Ionicons name={'lock-closed'} size={14} color={theme.textFaint} />
                        <Text style={{ fontSize: 12, color: theme.textFaint }}>{f.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, padding: 10, backgroundColor: theme.warning + '12', borderRadius: radius.md, borderWidth: 1, borderColor: theme.warning + '22' }}>
            <Ionicons name={'information-circle'} size={16} color={theme.warning} />
            <Text style={{ flex: 1, fontSize: 11.5, lineHeight: 16, color: theme.textMuted }}>
              Toutes les formations sont affichées mais grisées avec un cadenas 🔒 si vous n'avez pas l'accès. Même principe pour les niveaux à l'intérieur d'une formation.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Session</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <InfoRow icon={'key-outline'} label={'Jeton d’accès'} value={`valide ${expiresIn}`} />
          <Divider />
          <InfoRow icon={'shield-checkmark-outline'} label={'Stockage'} value={'Trousseau sécurisé'} />
          <Divider />
          <InfoRow icon={'moon-outline'} label={'Thème'} value={scheme === 'dark' ? 'Sombre (système)' : 'Clair (système)'} />
          <Divider />
          <InfoRow icon={'bookmark-outline'} label={'Documents suivis'} value={`${documentsTracked}`} />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Activité réseau</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 }]}>
          {logs.length === 0 ? (
            <Text style={[styles.logEmpty, { color: theme.textFaint }]}>Aucune requête enregistrée.</Text>
          ) : (
            logs.map((log, index) => (
              <View key={`${log.at}-${index}`} style={styles.logRow}>
                <View
                  style={[
                    styles.logStatus,
                    { backgroundColor: log.status === 200 ? theme.success + '1F' : theme.danger + '1F' },
                  ]}
                >
                  <Text style={{ color: log.status === 200 ? theme.success : theme.danger, fontSize: 10.5, fontWeight: '900' }}>
                    {log.status}
                  </Text>
                </View>
                <Text style={[styles.logPath, { color: theme.textMuted }]} numberOfLines={1}>
                  {log.method} {log.path}
                </Text>
                <Text style={[styles.logTime, { color: theme.textFaint }]}>{log.durationMs} ms</Text>
              </View>
            ))
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Qualité & sécurité</Text>
        <View style={{ gap: spacing.sm }}>
          <ActionRow
            icon={'flask-outline'}
            label={'Lancer la suite de tests'}
            hint={'Stores, API, navigation, lecteur PDF, E2E'}
            onPress={() => navigation.navigate('Diagnostics')}
          />
          <ActionRow
            icon={'time-outline'}
            label={'Simuler une session expirée'}
            hint={'Vérifie l’intercepteur et la redirection'}
            onPress={() => void authStore.simulateExpiredSession()}
          />
          <ActionRow
            icon={'refresh-outline'}
            label={'R\u00e9initialiser ma progression'}
            hint={`${documentsTracked} document(s) suivis \u2022 local + serveur`}
            onPress={() => progressionStore.resetAll()}
          />
        </View>

        <Button
          label={'Se déconnecter'}
          icon={'log-out-outline'}
          variant={'danger'}
          onPress={() => void authStore.logout()}
          style={{ marginTop: spacing.sm }}
        />

        <Text style={[styles.version, { color: theme.textFaint }]}>
          PDF Formation v1.0.0 • API {'\u2022'} NestJS • Aucun document n’est stocké sur l’appareil
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={theme.textFaint} />
      <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

function ActionRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.actionHint, { color: theme.textFaint }]}>{hint}</Text>
      </View>
      <Ionicons name={'chevron-forward'} size={18} color={theme.textFaint} />
    </Pressable>
  );
}
