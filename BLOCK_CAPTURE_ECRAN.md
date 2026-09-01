# Blocage Capture d'Écran et Vidéo

## Objectif
Bloquer toute capture d'écran et enregistrement vidéo dans l'application pour protéger les contenus de formation sensibles.

## Solution : expo-screen-capture ~57.0.2

### Installation
```json
"expo-screen-capture": "~57.0.2"
```

Compatible Expo SDK 57. Autolinking natif, aucun config plugin supplémentaire nécessaire.
Pour bare workflow, FLAG_SECURE est géré automatiquement.

### Implémentation

#### 1. Protection globale (App.tsx)
```tsx
import { useScreenCaptureProtection } from './src/core/security/screenCapture';

function AppContent() {
  useScreenCaptureProtection(); // hook principal
  ...
}
```

`useScreenCaptureProtection()` dans `src/core/security/screenCapture.ts` :
- Appelle `usePreventScreenCapture()` → active FLAG_SECURE sur Android tant que le composant est monté
- Active `enableAppSwitcherProtectionAsync()` sur iOS → floute/noircit l'app dans le multitâche
- Ajoute `addScreenshotListener()` pour audit/log des tentatives
- Cleanup automatique au démontage

#### 2. Protection renforcée lecteur PDF (PdfReaderScreen.tsx)
```tsx
import { usePreventScreenCapture } from 'expo-screen-capture';
usePreventScreenCapture();
```
Défense en profondeur : même si la protection globale est retirée, le lecteur reste protégé.

### Comportement par plateforme

| Plateforme | Screenshot | Enregistrement vidéo | App Switcher / Recents | Partage d'écran |
|------------|------------|----------------------|------------------------|-----------------|
| Android | Bloqué (toast système "Can't take screenshot due to security policy") + image noire | Bloqué (vidéo noire) | Aperçu noir | Bloqué |
| iOS 13+ | Image noire | Vidéo noire (iOS 11+) | Flou/noir via enableAppSwitcherProtection | Partiel |
| iOS <13 | Détecté via listener (pas bloqué nativement) | Bloqué 11+ | Flou | - |
| Web | Non applicable (navigateur) | Non applicable | - | - |

### API exposée (src/core/security/screenCapture.ts)

- `useScreenCaptureProtection()` : hook principal à monter en haut de l'arbre
- `enableScreenCaptureBlocking()` / `disableScreenCaptureBlocking()` : contrôle impératif
- `useScreenshotDetection(cb)` : écoute simple pour debug/analytics

### Limitations connues

- iOS <13 : screenshot ne peut pas être totalement bloqué, seulement détecté. Solution : afficher watermark + log.
- Sur émulateur/simulateur, FLAG_SECURE peut ne pas s'appliquer.
- Sur Android rooté ou avec outils type scrcpy en mode privilégié, contournement possible côté OS (pas contournable 100% sans DRM).
- Web : aucune protection native, on s'appuie sur CSS `user-select: none` + watermark si besoin.

### Tests manuels

1. Android physique :
   - Power + Volume Down → doit afficher "Impossible de faire une capture"
   - Enregistrement d'écran système → vidéo noire
   - Ouvrir recents → aperçu noir
2. iOS physique :
   - Side + Volume Up → image noire dans Photos (iOS 13+)
   - Enregistrement d'écran Control Center → vidéo noire
   - Double-clic Home / swipe multitâche → contenu flouté

### Évolutions possibles

- Watermark dynamique avec userId + timestamp sur PdfPageView pour traçabilité si photo externe avec autre appareil
- Détection screenshot → envoyer event sécurité au backend
- Désactiver protection sur écrans non sensibles (Login) via `allowScreenCaptureAsync()` conditionnel si besoin métier
- Ajouter `expo-secure-store` pour stocker logs d'audit chiffrés

### Références

- Docs Expo : https://docs.expo.dev/versions/latest/sdk/screen-capture/
- Android FLAG_SECURE : https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE
- PR GitHub iOS implémentation : https://github.com/expo/expo/pull/37874
