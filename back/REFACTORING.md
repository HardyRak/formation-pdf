# Refactoring — Backend `formation-pdf`

> Réalisé le 2026-09-03 sur la branche `arena/01a066f8-formation-pdf`.
> Objectif : améliorer la qualité, la sécurité, la maintenabilité et la
> testabilité **sans modifier le comportement fonctionnel** de l'API.

## 0. Périmètre

Le projet NestJS vit dans `back/`. Il a été audité puis refactoré selon les
règles d'architecture feature-first, de responsabilité unique, de typage strict
et de sécurité. Toutes les vérifications baseline passent :

```
npm run typecheck  → exit 0
npm run build      → exit 0
npm run test       → 13 tests (Jest)
npm run test:access→ ✅ (inclut le nouveau scénario de régression)
npm run test:logs  → ✅
```

---

## 1. Audit — problèmes identifiés (par gravité)

### 🔴 Sécurité

- **`revokeDocument` — escalade de privilège** (`access/access.service.ts`) :
  en retirant le **dernier** document d'un grant, le code écrivait
  `documentIds: []`, or la sémantique du projet est *« `documentIds` vide = tous
  les documents du niveau »*. Révoquer un accès **ouvrait donc tout le niveau**.
  Vérifié et corrigé + test de régression ajouté.
- **Identifiants MongoDB commités en clair** (`docker-compose.yml`) :
  `MONGO_INITDB_ROOT_PASSWORD: 50jKekQ3a1Qp`. Recodé pour lire `.env`, aucun
  secret en dur.
- **`console.log` / `console.error`** dans le code de production (`main.ts`,
  `seed/`) : remplacés par le `Logger` NestJS.
- **URI MongoDB journalisée** (`seed/run-seed.ts`) exposait `user:password` :
  masquée via `maskMongoUri`.

### 🟠 Architecture / maintenabilité

- **`admin/admin.service.ts` (666 lignes) monolithique** : CRUD utilisateurs,
  accès, catalogue, PDF, statistiques. Découpé en services focalisés (voir §2).
- **Duplication de la projection utilisateur** : `toUserDto` dupliquée entre
  `auth/service` et `admin/service`. Centralisée dans `users/user.mapper.ts`.
- **Duplication des utilitaires d'identifiants** (`slug`, `escapeRegex`,
  `shortId`) entre `admin` et `seed`. Centralisés dans `common/id.util.ts`.
- **`process.env.MAX_UPLOAD_MB` lu directement dans le contrôleur** :
  conservé (valeur évaluée au chargement du décorateur, avant injection),
  mais identifié comme limite à revoir si l'on introduit un `FileInterceptor`
  custom.

### 🟡 Qualité / typage

- `any` / cast lacunaires dans les mappers (tolérés en `lean` Mongo, mais les
  types métiers sont désormais explicités).
- `AdminList<T>` dupliqué et `PdfFileMeta` non typé : typés dans
  `admin/admin.types.ts`.

### ✅ Points forts conservés (aucune régression)

- Config 100 % par environnement + validation Joi fail-fast.
- Passwords scrypt + comparaison à temps constant.
- Refresh token opaque haché + rotation.
- ACL serveur (source de vérité) avec cascade document → niveau → formation.
- PDF sur volume, jamais d'URL publique, `no-store` sur `/stream`.
- Journalisation enrichie avec masquage des données sensibles.

---

## 2. Architecture cible (feature-first)

Le module `admin` est désormais organisé en services à responsabilité unique :

```
src/admin/
├── admin.module.ts          # agrège les services + garde MANAGER
├── admin.controller.ts      # mince : délègue aux services
├── admin.types.ts           # AnyDoc, AdminDoc, AdminList, PdfFileMeta, withId
├── admin-users.service.ts   # CRUD des comptes
├── admin-access.service.ts  # attribution / révocation des droits
├── admin-catalog.service.ts # CRUD catalogue + import PDF + compteurs
├── admin-stats.service.ts   # agrégations du tableau de bord
├── pdf.util.ts              # computePdfFileMeta / removePdfFile
├── manager.guard.ts         # garde rôle MANAGER
└── dto.ts                   # DTOs de validation
```

Déplacement vers `common/` / `users/` (réellement partagé) :

```
src/common/id.util.ts        # slug / escapeRegex / shortId
src/common/uploads.ts        # storage Multer + résolution UPLOAD_DIR (admin, catalog, main)
src/users/user.mapper.ts     # toUserDto (projection sûre, jamais passwordHash)
```

Suppression de `admin/admin.service.ts` (la logique est répartie dans les
services ci-dessus).

---

## 3. Corrections détaillées

### 3.1 `revokeDocument` (sécurité)

Avant : le dernier document retiré écrivait `documentIds: []` → tout ré-ouvert.

Après :

```
révoquer le dernier document d'un grant → suppression du grant entier
```

Cela garantit que ni le document révoqué ni les autres documents du niveau ne
deviennent lisibles (pas d'escalade). `grantsFor` ne retourne plus la formation.

### 3.2 `docker-compose.yml`

- Identifiants retirés du fichier : lus depuis `.env`
  (`${MONGO_USER}`, `${MONGO_PASSWORD}`).
- Services `seed` (one-shot) et `api` ajoutés pour correspondre au README.
- Healthcheck sur `mongo` + `depends_on: service_healthy`.
- `JWT_SECRET` requis (`:?`), jamais de valeur par défaut compromettante.

### 3.3 Logging

- `main.ts` : `Logger.log(..., 'Bootstrap')` au lieu de `console.log`.
- `seed/run-seed.ts` : `Logger` + `maskMongoUri` (URI sans identifiants).
- `seed/seed.service.ts` : `Logger` + `slug` partagé.

### 3.4 Typage & DTO

- `users/user.mapper.ts` : projection `UserDto` unique, `passwordHash` jamais
  exposé.
- `admin.types.ts` : types de réponse explicites.

---

## 4. Tests ajoutés

Un framework de test **Jest** a été introduit (`jest` + `ts-jest`).

| Fichier | Couverture |
| --- | --- |
| `test/unit/access.service.spec.ts` | droits d'accès, cascade, fusion, **révocation du dernier document (régression sécurité)**, grants anciens |
| `test/unit/progression.service.spec.ts` | fusion `pagesRead` par union, last-write-wins, recalcul `percent`/`completed`, reset |

Nouveaux scripts : `npm run test`, `npm run test:watch`, `npm run test:cov`.

---

## 5. Vérification finale

```bash
cd back
npm ci
npm run typecheck
npm run build
npm run test
npm run test:access
npm run test:logs
```

Chaque commande sort avec le code de sortie `0`.

---

## 6. Limites / choix conservateurs

- **`forbidNonWhitelisted: false`** conservé sur le `ValidationPipe` pour ne pas
  casser d'éventuels clients envoyant un champ inconnu (règle « ne pas modifier
  les contrats API »). `whitelist: true` + `transform: true` restent actifs.
- **Pas de CI ajoutée** (hors périmètre demandé) : les checks sont documentés
  ci-dessus ; une GitHub Action minimale serait une bonne suite.
- **`android/` et `.expo/` à la racine** : ne relèvent pas du backend et n'ont
  pas été touchés.
