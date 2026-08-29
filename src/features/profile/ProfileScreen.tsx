import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useColorScheme } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, spacing, radius, shadow } from '../../core/theme/theme';
import { Button } from '../../ui/components/Button';
import { authStore, useAuthStore } from '../../core/state/auth.store';
import { progressionStore, useProgressionStore } from '../../core/state/progression.store';
import { requestLogs } from '../../core/api/http-client';

export function ProfileScreen({ navigation }: any) {
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
            <View style={[styles.avatar, { backgroundColor: auth.user?.avatarColor ?? theme.primary }]}>
              <Text style={styles.avatarText}>
                {(auth.user?.firstName?.[0] ?? '') + (auth.user?.lastName?.[0] ?? '')}
              </Text>
            </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.6 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 19 },
  userName: { fontSize: 18, fontWeight: '800' },
  userMail: { fontSize: 13 },
  roleTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, marginTop: 2 },
  roleText: { fontSize: 11, fontWeight: '800' },
  sectionTitle: { fontSize: 16.5, fontWeight: '800', marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  infoLabel: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  infoValue: { fontSize: 13.5, fontWeight: '800' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logStatus: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  logPath: { flex: 1, fontSize: 12, fontWeight: '600' },
  logTime: { fontSize: 11, fontWeight: '700' },
  logEmpty: { fontSize: 12.5 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  actionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14.5, fontWeight: '700' },
  actionHint: { fontSize: 11.5 },
  version: { fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
