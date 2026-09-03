#!/usr/bin/env node
/**
 * Exécute la suite de tests embarquée (`src/testing/test-suite.ts`) hors de
 * l'application, dans Node.js — sans dépendance supplémentaire.
 *
 * Principe :
 *  1. `npm run build:suite` compile le graphe d'imports de test-suite.ts en
 *     CommonJS vers `node_modules/.cache/suite` (jamais commité).
 *  2. Ce script charge ce graphe en « mode mock » (EXPO_PUBLIC_API_MODE=mock)
 *     et neutralise les modules natifs (`react-native`, `expo-secure-store`,
 *     AsyncStorage) qui ne peuvent pas s'exécuter sous Node.
 *
 * La couverture est volontairement limitée aux couches pures de l'application
 * (stores, mock backend, services, utilitaires, navigation) : les écrans et
 * composants nécessitent un émulateur / appareil (ou l'écran « Diagnostics »
 * de l'application).
 */
'use strict';

process.env.EXPO_PUBLIC_API_MODE = process.env.EXPO_PUBLIC_API_MODE ?? 'mock';

const Module = require('module');

// Stubs des modules natifs (exécutés uniquement par `secure-storage`, jamais
// appelés par la suite : les méthodes ne font rien et ne bloquent pas).
const nativeStubs = {
  'react-native': {
    Platform: { OS: 'web', select: (dict) => dict.web ?? dict.default },
  },
  'expo-secure-store': {
    getItemAsync: async () => null,
    setItemAsync: async () => undefined,
    deleteItemAsync: async () => undefined,
  },
  '@react-native-async-storage/async-storage': {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
  },
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(nativeStubs, request)) {
    return nativeStubs[request];
  }
  return originalLoad.call(this, request, parent, isMain);
};

const path = require('path');

const suiteArg = process.argv[2];
if (!suiteArg) {
  console.error('Usage : node scripts/run-suite.js <chemin-vers-test-suite.js>');
  process.exit(2);
}
// Résout le chemin depuis la racine du projet (ou chemin absolu).
const suitePath = path.isAbsolute(suiteArg) ? suiteArg : path.resolve(process.cwd(), suiteArg);

// eslint-disable-next-line import/no-dynamic-require
const { runTestSuite, TEST_COUNT } = require(suitePath);

(async () => {
  const results = await runTestSuite();

  let passed = 0;
  const failures = [];
  for (const result of results) {
    if (result.passed) {
      passed += 1;
    } else {
      failures.push(result);
    }
    const mark = result.passed ? 'PASS' : 'FAIL';
    console.log(`[${mark}] (${String(result.durationMs).padStart(5)} ms) ${result.suite} › ${result.name}`);
    if (!result.passed) {
      console.log(`       ${result.detail ?? ''}`);
    }
  }

  console.log(`\n${passed}/${TEST_COUNT} tests réussis.`);
  if (failures.length > 0) {
    console.error(`${failures.length} échec(s) — voir détail ci-dessus.`);
    process.exit(1);
  }
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
