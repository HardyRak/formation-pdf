import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../core/theme/theme';
import { authStore, useAuthStore } from '../core/state/auth.store';
import { formationStore } from '../core/state/formation.store';
import { levelStore } from '../core/state/level.store';
import { documentStore } from '../core/state/document.store';
import { LoginScreen } from '../features/auth/LoginScreen';
import { FormationsScreen } from '../features/formations/FormationsScreen';
import { LevelsScreen } from '../features/levels/LevelsScreen';
import { DocumentsScreen } from '../features/documents/DocumentsScreen';
import { PdfReaderScreen } from '../features/reader/PdfReaderScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { DiagnosticsScreen } from '../features/diagnostics/DiagnosticsScreen';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabsNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarStyle: {
          backgroundColor: theme.bgElevated,
          borderTopColor: theme.border,
          height: 64,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '700' },
        tabBarIcon: ({ color, focused, size }) => {
          const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            FormationsTab: ['library', 'library-outline'],
            ProgressTab: ['stats-chart', 'stats-chart-outline'],
            ProfileTab: ['person-circle', 'person-circle-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? active : inactive} size={size - 1} color={color} />;
        },
      })}
    >
      <Tab.Screen name={'FormationsTab'} component={FormationsScreen} options={{ title: 'Formations' }} />
      <Tab.Screen name={'ProgressTab'} component={ProgressScreen} options={{ title: 'Progression' }} />
      <Tab.Screen name={'ProfileTab'} component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

function SplashScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: theme.bg }]}>
      <View style={[styles.splashLogo, { backgroundColor: theme.primary }]}>
        <Ionicons name={'document-text'} size={34} color={'#fff'} />
      </View>
      <Text style={[styles.splashTitle, { color: theme.text }]}>PDF Formation</Text>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const auth = useAuthStore();
  const authenticated = !!auth.session;

  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  // Purge des stores métier à la déconnexion (équivalent d'un provider scope).
  useEffect(() => {
    if (!authenticated) {
      formationStore.reset();
      levelStore.reset();
      documentStore.reset();
    }
  }, [authenticated]);

  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: theme.bg,
      card: theme.bgElevated,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  if (auth.bootstrapping) return <SplashScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {authenticated ? (
          <>
            <Stack.Screen name={'Tabs'} component={TabsNavigator} />
            <Stack.Screen name={'Levels'} component={LevelsScreen} />
            <Stack.Screen name={'Documents'} component={DocumentsScreen} />
            <Stack.Screen
              name={'Reader'}
              component={PdfReaderScreen}
              options={{ animation: 'fade_from_bottom', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name={'Diagnostics'} component={DiagnosticsScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        ) : (
          <Stack.Screen name={'Login'} component={LoginScreen} options={{ animation: 'fade' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  splashLogo: { width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  splashTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
});
