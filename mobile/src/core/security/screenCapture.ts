/**
 * Sécurité : Blocage capture d'écran et enregistrement vidéo
 *
 * Utilise expo-screen-capture (~57.0.2) pour bloquer toute capture
 * sur Android (FLAG_SECURE) et iOS (secure UITextField + app switcher).
 *
 * - Android: FLAG_SECURE empêche screenshots, enregistrement vidéo,
 *   et affiche écran noir dans le switcher d'apps / partage d'écran.
 * - iOS 11+: enregistrement vidéo bloqué (écran noir)
 * - iOS 13+: screenshot bloqué (image noire) via champ texte sécurisé
 * - iOS: enableAppSwitcherProtectionAsync floute le contenu dans le multitâche
 *
 * La protection est appliquée globalement dans App.tsx via usePreventScreenCapture().
 */

import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  usePreventScreenCapture,
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
  addScreenshotListener,
  enableAppSwitcherProtectionAsync,
  disableAppSwitcherProtectionAsync,
} from 'expo-screen-capture';

/**
 * Active le blocage de capture d'écran de manière impérative.
 * À utiliser si on veut contrôler manuellement hors hook.
 */
export async function enableScreenCaptureBlocking(): Promise<void> {
  try {
    await preventScreenCaptureAsync();
    if (Platform.OS === 'ios') {
      // Protection supplémentaire : floutage dans le switcher iOS
      await enableAppSwitcherProtectionAsync();
    }
  } catch (e) {
    console.warn('[Security] enableScreenCaptureBlocking failed', e);
  }
}

/**
 * Désactive le blocage (ex: écran de partage autorisé, debug).
 * Ne doit pas être appelé en production sauf cas exceptionnel.
 */
export async function disableScreenCaptureBlocking(): Promise<void> {
  try {
    await allowScreenCaptureAsync();
    if (Platform.OS === 'ios') {
      await disableAppSwitcherProtectionAsync();
    }
  } catch (e) {
    console.warn('[Security] disableScreenCaptureBlocking failed', e);
  }
}

/**
 * Hook principal à monter au plus haut niveau de l'app (App.tsx).
 * - Bloque capture pendant que le composant est monté
 * - Active protection app switcher sur iOS
 * - Écoute les tentatives de screenshot pour log/audit
 */
export function useScreenCaptureProtection() {
  // Hook Expo : ajoute FLAG_SECURE sur Android et secure TextField sur iOS
  // Tant que ce hook est monté, la capture est bloquée.
  usePreventScreenCapture();

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;

    (async () => {
      try {
        // Renforce la protection iOS : image floutée/noire dans le multitâche
        if (Platform.OS === 'ios') {
          await enableAppSwitcherProtectionAsync();
        }
      } catch (e) {
        console.warn('[Security] AppSwitcher protection failed', e);
      }

      // Listener : détecte tentative de screenshot (même si bloquée, utile pour audit)
      try {
        subscription = addScreenshotListener(() => {
          // Sur Android FLAG_SECURE empêche déjà, sur iOS <13 peut être déclenché
          // On log pour audit / alerte sécurité future
          console.warn('[Security] Tentative de capture d\'écran détectée');
          // Ici on pourrait envoyer un event analytics / log sécurité
        });
      } catch (e) {
        // addScreenshotListener peut échouer sur web / simulateur
        console.warn('[Security] Screenshot listener failed', e);
      }
    })();

    return () => {
      subscription?.remove();
      // Ne pas désactiver allowScreenCaptureAsync ici car usePreventScreenCapture
      // gère déjà le cleanup. On désactive juste le switcher protection.
      if (Platform.OS === 'ios') {
        void disableAppSwitcherProtectionAsync().catch(() => {});
      }
    };
  }, []);
}

/**
 * Hook léger si on veut seulement écouter sans bloquer (debug).
 */
export function useScreenshotDetection(onScreenshot: () => void) {
  const stableCallback = useCallback(onScreenshot, [onScreenshot]);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      sub = addScreenshotListener(stableCallback);
    } catch {}
    return () => sub?.remove();
  }, [stableCallback]);
}
