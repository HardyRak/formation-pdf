# PDF Formation — Application mobile (Expo)

Application mobile de la plateforme **PDF Formation** (voir `../README.md` et `../back/`).

## Démarrage

```bash
npm install
cp .env.example .env   # configurer l'URL de l'API (voir ci-dessous)
npm start              # Expo (iOS / Android)
npm run web            # Web
```

## Configuration d'environnement

L'application lit ses variables via un fichier `.env` (jamais commité,
modèle dans `.env.example`). Variables disponibles :

| Variable | Rôle | Valeurs |
| --- | --- | --- |
| `EXPO_PUBLIC_API_MODE` | Mode de transport du client HTTP | `remote` (API NestJS) · `mock` (backend simulé embarqué) |
| `EXPO_PUBLIC_API_URL` | URL de base de l'API (préfixe `/v1` inclus) | ex. `http://localhost:3000/v1` |

> Sur un appareil physique ou l'émulateur Android, `localhost` ne pointe pas
> vers votre machine : utilisez respectivement l'IP LAN de la machine ou
> `http://10.0.2.2:3000/v1`.

## Mode `mock` vs `remote`

- **`mock`** : l'application utilise le backend simulé embarqué
  (`src/core/api/backend/`) — aucun serveur requis, utile pour la démo et les tests.
- **`remote`** : requêtes HTTP réelles vers le backend NestJS (`../back/`),
  avec interception 401 + refresh automatique du jeton.

Le contrôle d'accès est chargé depuis `GET /auth/me/access` (voir
`src/core/state/access.store.ts`), avec repli sur les règles statiques de
`src/core/security/access.ts`.

## Lecteur PDF : contenu en blocs **et** vrais fichiers PDF

Le lecteur (`PdfReaderScreen`) gère **deux** types de contenu, selon ce que le
backend renvoie sur `/documents/:id/stream` :

- **Vrai fichier PDF** (nouveau) : le flux authentifié renvoie le **binaire**
  (`Content-Type: application/pdf`). Le mobile le récupère via `httpClient.getBinary`
  (avec jeton + rejeu 401), l'affiche par `PdfViewer` :
  - **iOS / Android** : `src/components/PdfViewer.native.tsx` → `react-native-pdf`
    (rendu natif, base64, `onPageChanged` pour le suivi de progression).
    ⚠️ Nécessite un **development build** (module natif, pas Expo Go).
  - **Web** : `src/components/PdfViewer.web.tsx` → `<iframe>` + Blob URL (lecteur
    natif du navigateur). Le suivi de page repose sur les boutons préc./suiv.
  - Le contenu ne passe **jamais** par une URL publique : les octets sont
    récupérés avec le jeton puis rendus localement.
- **Blocs** (ancien modèle, seed / mode mock) : rendu par `PdfPageView` comme
  avant (pages structurées `h1/p/bullets/callout/…`).

Dans les deux cas, la progression (position, % lu, pages vues) est suivie et
synchronisée en base exactement de la même manière.

## Compatibilité Android : pages 16 KB & permissions de stockage

Le projet est configuré pour **Expo SDK 57 / React Native 0.86** (New Architecture),
qui est **16 KB compatible par défaut**. Pour garantir le build :

- `expo-build-properties` force `compileSdkVersion`/`targetSdkVersion` 36,
  `buildToolsVersion` 36.0.0 et surtout `useLegacyPackaging: false`
  (librairies natives non compressées et alignées 16 KB). Le NDK utilisé par
  RN 0.86 est `27.1.12297006` (alignement 16 KB par défaut) et RN injecte
  automatiquement `-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON`.
- Les dépendances natives sont alignées sur les versions testées du SDK 57 :
  `react-native-blob-util@0.24.10`, `react-native-worklets@0.10.1`,
  `react-native-reanimated@4.5.1`. `react-native-blob-util` (dépendance
  `peer`/runtime de `react-native-pdf`) et `react-native-worklets`
  (dépendance de `react-native-reanimated`) **doivent** être installés
  explicitement.
- Le plugin local `plugins/withStoragePermissionsMaxSdk` retire
  `android:maxSdkVersion` de `READ/WRITE_EXTERNAL_STORAGE` dans le manifest
  applicatif, pour être cohérent avec les bibliothèques (surtout
  `react-native-blob-util`) qui déclarent ces permissions **sans** attribut.
  Cela supprime l'avertissement *« Expo Max Sdk Override Plugin »* du manifest
  fusionné (qui retire de toute façon `maxSdkVersion`), tout en gardant le même
  résultat.

## Build natif Android : `libworklets.so` manquant (correctif `patch-package`)

Avec Expo SDK 57 + `react-native-worklets@0.10.1` + `react-native-reanimated@4.5.1`,
`expo-modules-core` tente de lier `libworklets.so` (via prefab) pendant
`:expo-modules-core:buildCMakeDebug[x86_64]`. Le reanimated corrige déjà
l'ordre en faisant dépendre son `externalNativeBuild*` de celui de worklets,
mais `expo-modules-core` ne dépendait que de `mergeDebugNativeLibs`, ce qui
laissait `buildCMake` partir avant que le `.so` soit compilé :

```
ninja: error: '.../react-native-worklets/android/build/intermediates/cxx/.../libworklets.so',
needed by '.../libexpo-modules-core.so', missing and no known rule to make it
```

C'est un bug connu (expo/expo#42893, software-mansion/react-native-reanimated#9151).
Ce projet applique donc un **correctif local** à `expo-modules-core` via
`patch-package` (`patches/expo-modules-core+57.0.11.patch`) : via
`tasks.configureEach` il ajoute `dependsOn(externalNativeBuildDebug)`/`Release`
à **chaque** tâche CMake (`externalNativeBuild<Variant>` et les feuilles
`buildCMake<Variant>[abi]`), de sorte que l'exécution de ninja attende toujours
la compilation de `libworklets.so`. C'est le même mécanisme que le correctif
upstream de reanimated, mais appliqué à toutes les variantes (Debug,
RelWithDebInfo, Release) et à chaque ABI.

`npm install` applique automatiquement le patch grâce au script
`postinstall: patch-package`. **Ne pas supprimer le dossier `patches/`**.

> ⚠️ **Ne pas lancer `./gradlew clean` ni `cd android && gradlew clean`.**
> Sur New Architecture (RN 0.86), la tâche `:app:externalNativeBuildCleanDebug`
> échoue car CMake régénère `Android-autolinking.cmake` tandis que les dossiers
> `.../android/build/generated/source/codegen/jni/` viennent d'être supprimés :
>
> ```
> CMake Error ... add_subdirectory given source "...codegen/jni/" which is not an existing directory
> ```
>
> C'est un bug connu en amont (facebook/react-native#49387), **indépendant de ce
> projet** — il n'affecte que la tâche `clean` (un `assembleDebug` normal
> régénère le codegen avant la config CMake et fonctionne). Pour nettoyer le
> build, supprimer les dossiers générés manuellement puis reconstruire :
>
> ```bash
> cd mobile
> rm -rf android/app/build android/app/.cxx android/build android/.gradle
> npm install              # ré-applique le patch (patch-package)
> npm run android          # development build
> ```

> Après un changement de dépendances ou de plugin : recréer le projet natif puis
> relancer le build.

```bash
cd mobile
npm install            # ré-applique le patch (patch-package)
npx expo prebuild --clean
npm run android        # development build (module natif requis)
```

Pour vérifier la conformité 16 KB d'un APK produit, analyser le bundle dans
Android Studio (`Build` → `Analyze APK`) ou installer sur un appareil / émulateur
Android 15+ en mode 16 KB.

## Progression de lecture : sauvegarde en base

La progression des utilisateurs **n'est plus seulement locale** : elle est
persistée dans MongoDB via le backend (`collection `document_progress``),
tout en restant **offline-first**.

1. Chaque page lue est écrite immédiatement en local (AsyncStorage) — la
   lecture ne dépend jamais du réseau.
2. Les modifications sont empilées dans une file d'attente conservée même
   après redémarrage, puis poussées vers `PUT /progression/documents/:id`
   (léger debounce pour regrouper les pages). En cas d'échec réseau, la
   file est rejouée automatiquement (backoff 5 s → 60 s).
3. À la connexion / au démarrage (`hydrate`), la progression distante est
   fusionnée (`GET /progression`) : union des pages lues, position reprise
   sur l'entrée la plus récente (« last write wins »). La progression suit
   donc l'utilisateur sur **tous ses appareils**.

L'état de synchronisation est visible sur l'écran « Ma progression »
(badge cloud : synchronisé / en cours / en attente). Réinitialiser la
progression (écran Progression ou Profil) efface les données **en local ET
en base**, pour l'utilisateur connecté uniquement.

## Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| LEARNER | `sophie.martin@pdftrain.io` | `demo1234` |
| MANAGER | `karim.benali@pdftrain.io` | `manager2024` |
