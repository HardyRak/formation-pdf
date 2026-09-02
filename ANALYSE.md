# Analyse du projet `formation-pdf`

> Établie le 2026-09-02 sur la branche `arena/01a06344-formation-pdf`
> (commit de base `394e7df`). Toutes les affirmations ci-dessous proviennent
> d'une commande réellement exécutée dans le dépôt.

---

## 1. Vue d'ensemble

Monorepo d'une plateforme de **bibliothèque de formation PDF sécurisée** :
3 applications + 1 projet natif Android généré.

| Dossier | Rôle | Stack | Fichiers TS/TSX | Lignes |
| --- | --- | --- | --- | --- |
| `mobile/` | App apprenant (iOS / Android / Web) | Expo SDK 57 · RN 0.86 · React 19 · TS strict | 78 | 6 929 |
| `back/` | API REST | NestJS 10 · Mongoose 8 · JWT · Joi · pdf-lib | 55 | 4 332 |
| `back-office/` | Admin web | Vite 6 · React 18 · React Router 6 · TanStack Query 5 · Zustand 5 | 15 | 1 677 |
| `android/` | Projet natif prébuildé (commité) | Gradle / Kotlin | 0 | 0 |

**Périmètre fonctionnel couvert** (39 routes côté API) : authentification
JWT + refresh rotatif, catalogue formations → niveaux → documents, ACL par
document avec cascade, progression de lecture synchronisée (offline-first),
administration complète (CRUD + upload PDF + stats), lecteur PDF binaire
authentifié côté mobile, blocage de capture d'écran.

**Historique Git** : un seul commit visible (`git log --all --oneline | wc -l`
→ `1`), un merge de PR. Pas d'historique exploitable, pas de `.github/`
(aucune CI).

---

## 2. État de santé vérifié

Dépendances installées (`npm ci`) puis checks propres au projet :

| Projet | Commande | Résultat |
| --- | --- | --- |
| `back/` | `npm run typecheck` | ✅ exit 0 |
| `back/` | `npm run build` (`nest build`) | ✅ exit 0 |
| `back/` | `npm run test:access` | ✅ 22 assertions, « TOUS LES TESTS D'ACCÈS PASSENT » |
| `back-office/` | `npm run typecheck` | ✅ exit 0 |
| `back-office/` | `npm run build` (`tsc -b && vite build`) | ✅ 90 modules, 242 kB |
| `mobile/` | `npx tsc --noEmit` | ✅ exit 0 |
| `mobile/` | `npx expo export --platform web` | ✅ exit 0 — mais ⚠️ warning favicon (voir §4.6) |

**Non vérifiable ici** : aucun `mongod` ni `docker` dans l'environnement
(`which mongod docker` → rien). L'API n'a donc pas pu être démarrée ni testée
contre une vraie base ; le seed n'a pas été exécuté.

**Ce qui manque côté outillage** : aucun framework de test (ni Jest, ni
Vitest). Les seuls « tests » sont `back/scripts/validate-access.ts` (script
manuel avec modèle Mongoose simulé en mémoire) et `mobile/src/testing/test-suite.ts`
(413 lignes, exécutées uniquement dans l'écran `DiagnosticsScreen` de l'app).

---

## 3. Architecture

```
                    ┌──────────────────────┐
   mobile (Expo) ───┤                      │
                    │  API NestJS  /v1     │──► MongoDB (7 collections)
 back-office (Vite)─┤  39 routes           │──► UPLOAD_DIR (*.pdf, volume)
                    └──────────────────────┘
```

**Points forts réels :**

- **Config 100 % par environnement** : `back/src/config/configuration.ts`
  centralise tout, `env.validation.ts` valide au démarrage en fail-fast (Joi),
  l'URI Mongo est *construite* et jamais saisie telle quelle.
- **Séparation mock / remote propre** : `mobile/src/core/config/env.ts`
  (`EXPO_PUBLIC_API_MODE`) bascule entre le backend simulé embarqué et l'API
  réelle, avec le même `httpClient` (Bearer + rejeu 401 + rejeu binaire).
- **Sécurité pensée** : mots de passe scrypt + comparaison à temps constant,
  refresh token opaque stocké haché (sha256) avec rotation, `Cache-Control:
  no-store` sur `/stream`, fichiers PDF nommés par UUID (pas de traversal),
  jamais d'URL publique pour le binaire, throttling renforcé sur `/auth/login`.
- **Progression convergente** : union des `pagesRead`, last-write-wins sur la
  position, recalcul serveur de `percent`/`completed`, entrées scellées au
  `userId` du JWT.
- **Documentation dense** : `back/README.md`, `back-office/CONCEPTION.md`
  (221 lignes, décisions verrouillées + tableau d'avancement), 4 docs mobiles
  dédiés (capture d'écran, sécurité, styles, build Android 16 KB).

---

## 4. Problèmes trouvés (par gravité)

### 4.1 🔴 Escalade de privilège dans `revokeDocument` — vérifiée

`back/src/access/access.service.ts`, méthode `revokeDocument`. Quand on retire
le **dernier** document d'un grant qui porte des `levelIds`, le code écrit
`documentIds: []` — or la sémantique du projet est *« `documentIds` vide = tous
les documents du niveau »*. Retirer un accès **ouvre donc tout le niveau**.

Vérifié en exécutant le vrai `AccessService` (seule la couche Mongo était
simulée, comme dans le test du projet) :

```
avant  | doc octroyé lisible      : true
avant  | autre doc du NIVEAU      : false
revoke retourne                  : true
grant après révocation           : {"levelIds":["l-hse-1"],"documentIds":[]}
APRÈS  | doc révoqué lisible      : true     <-- attendu false
APRÈS  | autre doc du NIVEAU      : true     <-- attendu false
```

Double effet : le document révoqué reste lisible **et** l'utilisateur gagne
tous les autres documents du niveau.

`npm run test:access` ne le détecte pas : son scénario 5 part d'un grant à
**deux** documents (`['doc-cyb-1','doc-cyb-2']`), donc `documentIds` ne devient
jamais vide. Le cas limite n'est pas couvert.

Effet secondaire mineur au même endroit : le `return (saved.modifiedCount ?? 0) > 0`
renvoie `false` quand la valeur ne change pas, alors que l'opération a réussi.

### 4.2 🔴 Identifiants MongoDB commités en dur

`back/docker-compose.yml` contient, en clair et versionné :

```yaml
MONGO_INITDB_ROOT_USERNAME: hardy
MONGO_INITDB_ROOT_PASSWORD: 50jKekQ3a1Qp
```

Deux problèmes : un mot de passe réel dans l'historique Git, et une
contradiction avec `back/README.md` qui annonce que *« docker compose lit
automatiquement le fichier `.env` (variables `MONGO_*`…) »* et que l'auth
Mongo s'active via `MONGO_USER`/`MONGO_PASSWORD`. Ici rien n'est lu du `.env`.

### 4.3 🟠 `docker-compose.yml` ne contient qu'un seul service

Le README documente trois services (`mongo`, `seed`, `api`) et donne les
commandes `docker compose up -d` (censé lancer l'API sur `:3000/v1`),
`docker compose up --force-recreate seed`, `docker compose logs -f api`.
Le fichier réel ne définit que `mongo` (+ son volume). L'« Option A —
recommandée » du README est donc inopérante en l'état : pas d'API, pas de seed.

### 4.4 🟠 `GET /v1/logs` lisible par n'importe quel apprenant

`back/src/logs/log.controller.ts` n'est protégé que par `JwtAuthGuard` — pas
par `ManagerGuard`. Tout compte `LEARNER` authentifié peut donc lire les 200
dernières requêtes de l'API (URLs, en-têtes, corps, statuts, durées). Le
masquage de `mask.util.ts` couvre bien tokens/mots de passe, mais cela reste
une exposition de télémétrie interne à des utilisateurs non administrateurs.
La route n'apparaît d'ailleurs dans aucun tableau du README.

### 4.5 🟠 Fichiers générés commités à la racine

`git ls-files` montre `17` fichiers sous `.expo/` (dont le cache d'icônes
`web/cache/production/images/…`) et `43` fichiers sous `android/`.
`mobile/.gitignore` ignore bien `/android`, `/ios` et `.expo/`, **mais ces
règles sont relatives à `mobile/`** ; le `.gitignore` racine ne couvre ni
`.expo/` ni `android/`. Le projet natif Android commité à la racine est en
plus incohérent avec le flux documenté (`cd mobile && npx expo prebuild`
produirait `mobile/android/`).

### 4.6 🟡 Favicon référencé mais absent

`mobile/app.json` déclare `"web": { "favicon": "./assets/favicon.png" }`,
or `ls mobile/assets/` ne contient que `icon.png`. Confirmé par l'export web :

```
Favicon source file in Expo config (web.favicon) does not exist: ./assets/favicon.png
```

L'export réussit quand même (exit 0), mais le warning est réel. Même fichier :
`android.adaptiveIcon` est `{}` (vide) et aucune clé `splash` n'est définie.

### 4.7 🟡 Branding resté sur le template Expo

`mobile/app.json` : `"name": "Agon Preview"`, `"slug": "agon-preview"`,
`package`/`bundleIdentifier` = `com.anonymous.agonpreview`,
`"owner": "arcadalabs"` + un `projectId` EAS. Idem côté natif
(`android/app/build.gradle` : `applicationId 'com.anonymous.agonpreview'`,
`strings.xml` : `Agon Preview`). Rien ne rattache l'app à « PDF Formation ».

### 4.8 🟡 Documentation en décalage avec le code

- `README.md` racine : back-office « Stack : **À définir** », backend
  « scaffolding à venir » — alors que les deux sont implémentés et buildent.
- `back-office/CONCEPTION.md` §2 et §4.1 décrivent un stockage **GridFS**
  (`fs.files`/`fs.chunks`, `fileId`) ; l'implémentation réelle utilise un
  **volume disque** (`UPLOAD_DIR`, `admin/uploads.ts`). Seul le tableau
  d'avancement §8 mentionne le volume.
- `back/README.md` §« Adaptation nécessaire côté mobile » annonce un chantier
  à faire sur `isTokenExpired` (secondes vs millisecondes) ; c'est déjà
  traité dans `mobile/src/core/api/http-client.ts` (normalisation
  `payload.exp < 1e12`).
- La route `/v1/logs` n'est documentée nulle part.

### 4.9 🟡 Duplication des contrats et du catalogue

- **3 copies** du contrat d'API : `back/src/common/contracts.ts` (111 l.),
  `mobile/src/core/models/index.ts` (127 l.), `back-office/src/api/types.ts`
  (92 l.). Aucun paquet partagé : une évolution de DTO doit être répliquée
  trois fois à la main.
- **2 copies divergentes** du catalogue de seed :
  `back/src/seed/catalog-seed.ts` (586 l.) et `mobile/src/core/data/seed.ts`
  (585 l.) — la comparaison normalisée des deux fichiers indique qu'ils
  **diffèrent** déjà.

### 4.10 🟡 Pas de CI, déploiement Vercel non outillé

Aucun `.github/` : les typechecks/builds/test:access ne sont jamais joués
automatiquement. `mobile/vercel.json` pose `"buildCommand": null` avec
`"outputDirectory": "dist"` alors que `dist/` est gitignoré et qu'aucun script
`build` web n'existe dans `mobile/package.json` (`web` = `expo start --web`).
Le déploiement Vercel n'a donc rien à servir — **à confirmer** côté Vercel
(comportement exact de `buildCommand: null` non vérifié ici).

---

## 5. Ce qui n'a pas pu être vérifié

- Comportement runtime de l'API (démarrage, seed, upload PDF, streaming,
  throttling) : pas de MongoDB ni de Docker dans l'environnement.
- Build natif Android / iOS : pas de SDK Android, pas de macOS. Le patch
  `patch-package` sur `expo-modules-core@57.0.11` s'applique bien
  (`expo-modules-core@57.0.11 ✔` à l'installation), mais le build Gradle
  lui-même n'a pas été lancé.
- Rendu PDF natif (`react-native-pdf`) : nécessite un development build.

---

## 6. Ordre d'intervention suggéré

1. **Corriger `revokeDocument`** (§4.1) + ajouter le cas limite au
   `test:access` : c'est une faille de sécurité confirmée et reproductible.
2. **Sortir les identifiants Mongo du compose** (§4.2) et **compléter le
   compose avec `api` + `seed`** (§4.3) pour que le README dise vrai.
3. **Protéger `/v1/logs` avec `ManagerGuard`** (§4.4).
4. **Nettoyer le dépôt** : retirer `.expo/` et `android/` du suivi, compléter
   le `.gitignore` racine (§4.5).
5. **Recaler la doc** (§4.8) et le branding (§4.6, §4.7).
6. **Outiller** : une CI minimale (typecheck ×3 + build ×2 + test:access),
   puis un vrai framework de test (§2, §4.10).
