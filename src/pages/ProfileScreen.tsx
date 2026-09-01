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
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackScreenProps<RootStackParamList, 'Tabs'>['navigation'] };

export function ProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const auth = useAuthStore();
  const progression = useProgressionStore();
  const scheme = useColorScheme();

  const expiresIn = useMemo(() => {
    if (!auth.session) return '—';
    const remaining = auth.session.expiresAt - Date.now();
    if (remaining <= 0) return 'expir\u00e9';
    return `${Math.max(1, Math.round(remaining / 60000))} min`;
  }, [auth.session]);

  const documentsTracked = Object.keys(progression.documents).length;
  const logs = requestLogs().slice(0, 5);

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

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Session</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <InfoRow icon={'key-outline'} label={'Jeton d\u2019acc\u00e8s'} value={`valide ${expiresIn}`} />
          <Divider />
          <InfoRow icon={'shield-checkmark-outline'} label={'Stockage'} value={'Trousseau s\u00e9curis\u00e9'} />
          <Divider />
          <InfoRow icon={'moon-outline'} label={'Th\u00e8me'} value={scheme === 'dark' ? 'Sombre (syst\u00e8me)' : 'Clair (syst\u00e8me)'} />
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
            label={'Simuler une session expir\u00e9e'}
            hint={'V\u00e9rifie l\u2019intercepteur et la redirection'}
            onPress={() => void authStore.simulateExpiredSession()}
          />
          <ActionRow
            icon={'refresh-outline'}
            label={'Vider la progression locale'}
            hint={`${documentsTracked} document(s) suivis`}
            onPress={() => progressionStore.resetAll()}
          />
        </View>

        <Button
          label={'Se d\u00e9connecter'}
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

