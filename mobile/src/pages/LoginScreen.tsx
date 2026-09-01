import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { styles } from './LoginScreen.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme, radius, spacing, shadow } from '../core/theme/theme';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { authStore, useAuthStore } from '../core/state/auth.store';
import { DEMO_CREDENTIALS } from '../core/api/backend/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const state = useAuthStore();

  const [email, setEmail] = useState(state.lastEmail);
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const loading = state.status === 'loading';

  const errors = useMemo(() => {
    const next: { email: string | null; password: string | null } = { email: null, password: null };
    if (!email.trim()) next.email = 'L\u2019adresse email est obligatoire.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Format d\u2019email invalide.';
    if (!password) next.password = 'Le mot de passe est obligatoire.';
    else if (password.length < 8) next.password = '8 caract\u00e8res minimum.';
    return next;
  }, [email, password]);

  const valid = !errors.email && !errors.password;

  useEffect(() => {
    if (state.error) authStore.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  const submit = async () => {
    setTouched({ email: true, password: true });
    if (!valid || loading) return;
    await authStore.login(email, password);
  };

  const useDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setTouched({ email: false, password: false });
    authStore.clearError();
  };

  const compact = width < 380;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps={'handled'}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(420)} style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: theme.primary }, shadow(10)]}>
              <Ionicons name={'document-text'} size={34} color={'#fff'} />
              <View style={[styles.logoBadge, { backgroundColor: theme.accent, borderColor: theme.bg }]}>
                <Ionicons name={'school'} size={13} color={'#fff'} />
              </View>
            </View>
            <Text style={[styles.appName, { color: theme.text, fontSize: compact ? 26 : 30 }]}>PDF Formation</Text>
            <Text style={[styles.tagline, { color: theme.textMuted }]}>
              Votre bibliothèque de formation sécurisée, disponible partout.
            </Text>
          </Animated.View>

          {state.notice ? (
            <Animated.View
              entering={FadeIn}
              style={[styles.notice, { backgroundColor: theme.warning + '1A', borderColor: theme.warning + '55' }]}
            >
              <Ionicons name={'time-outline'} size={17} color={theme.warning} />
              <Text style={[styles.noticeText, { color: theme.warning }]}>{state.notice}</Text>
            </Animated.View>
          ) : null}

          <Animated.View
            entering={FadeInDown.delay(120).duration(420)}
            style={[styles.card, { backgroundColor: theme.bgElevated, borderColor: theme.border }, shadow(8)]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>Connexion</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Identifiez-vous pour accéder à vos formations.
            </Text>

            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <TextField
                label={'Email'}
                icon={'mail-outline'}
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder={'prenom.nom@entreprise.fr'}
                keyboardType={'email-address'}
                autoCapitalize={'none'}
                autoComplete={'email'}
                returnKeyType={'next'}
                error={touched.email ? errors.email : null}
              />
              <TextField
                label={'Mot de passe'}
                icon={'lock-closed-outline'}
                value={password}
                onChangeText={setPassword}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                secure
                autoCapitalize={'none'}
                returnKeyType={'go'}
                onSubmitEditing={submit}
                error={touched.password ? errors.password : null}
              />
            </View>

            {state.error ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.errorBox, { backgroundColor: theme.danger + '14', borderColor: theme.danger + '44' }]}
              >
                <Ionicons name={'alert-circle'} size={18} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{state.error.message}</Text>
              </Animated.View>
            ) : null}

            <Button
              label={'Se connecter'}
              icon={'log-in-outline'}
              onPress={submit}
              loading={loading}
              disabled={!valid}
              style={{ marginTop: spacing.lg }}
            />

            <Pressable onPress={useDemo} style={styles.demoBtn} accessibilityLabel={'Utiliser le compte de d\u00e9monstration'}>
              <Ionicons name={'sparkles-outline'} size={15} color={theme.primary} />
              <Text style={[styles.demoText, { color: theme.primary }]}>Utiliser le compte de démonstration</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240)} style={styles.footer}>
            <View style={styles.footerRow}>
              <Ionicons name={'shield-checkmark-outline'} size={14} color={theme.textFaint} />
              <Text style={[styles.footerText, { color: theme.textFaint }]}>
                Connexion chiffrée • Jeton JWT stocké dans le trousseau sécurisé
              </Text>
            </View>
            <Text style={[styles.footerText, { color: theme.textFaint }]}>Version 1.0.0 • Groupe Ardentis</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

