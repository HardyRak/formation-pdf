import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, radius, shadow } from '../core/theme/theme';
import { ScreenHeader, Button } from '../components';
import { runTestSuite, TEST_COUNT, type TestResult } from '../testing/test-suite';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Diagnostics'>;

export function DiagnosticsScreen({ navigation }: Props) {
  const theme = useTheme();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const collected: TestResult[] = [];
    await runTestSuite((result) => {
      collected.push(result);
      setResults([...collected]);
    });
    setRunning(false);
  }, []);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const suites = Array.from(new Set(results.map((r) => r.suite)));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <ScreenHeader
          title={'Suite de tests'}
          subtitle={'Qualit\u00e9 logicielle'}
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }, shadow(4)]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>
              {results.length === 0 ? `${TEST_COUNT} tests disponibles` : `${results.length}/${TEST_COUNT} ex\u00e9cut\u00e9s`}
            </Text>
            <Text style={[styles.summarySub, { color: theme.textMuted }]}>
              Composants, stores, services API, navigation, lecteur PDF et E2E.
            </Text>
          </View>
          {results.length > 0 ? (
            <View style={styles.counters}>
              <View style={[styles.counter, { backgroundColor: theme.success + '1F' }]}>
                <Text style={[styles.counterValue, { color: theme.success }]}>{passed}</Text>
              </View>
              {failed > 0 ? (
                <View style={[styles.counter, { backgroundColor: theme.danger + '1F' }]}>
                  <Text style={[styles.counterValue, { color: theme.danger }]}>{failed}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <Button
          label={running ? 'Ex\u00e9cution\u2026' : 'Lancer les tests'}
          icon={'play'}
          onPress={() => void run()}
          loading={running}
        />

        {running && results.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Initialisation de l’environnement…</Text>
          </View>
        ) : null}

        {suites.map((suite) => (
          <View key={suite} style={{ gap: spacing.sm }}>
            <Text style={[styles.suiteTitle, { color: theme.text }]}>{suite}</Text>
            {results
              .filter((result) => result.suite === suite)
              .map((result, index) => (
                <Animated.View
                  key={`${suite}-${index}`}
                  entering={FadeIn.duration(220)}
                  style={[styles.testRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons
                    name={result.passed ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={result.passed ? theme.success : theme.danger}
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.testName, { color: theme.text }]}>{result.name}</Text>
                    {result.detail ? (
                      <Text style={[styles.testDetail, { color: theme.danger }]}>{result.detail}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.testDuration, { color: theme.textFaint }]}>{result.durationMs} ms</Text>
                </Animated.View>
              ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '800' },
  summarySub: { fontSize: 12.5, lineHeight: 17 },
  counters: { flexDirection: 'row', gap: 8 },
  counter: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 16, fontWeight: '900' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: spacing.md },
  loadingText: { fontSize: 13 },
  suiteTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  testName: { fontSize: 13.5, fontWeight: '600' },
  testDetail: { fontSize: 11.5, fontWeight: '600' },
  testDuration: { fontSize: 11, fontWeight: '700' },
});
