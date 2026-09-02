# Back-office — PDF Formation · Conception (v3 — validée)

> Document de **conception** (phase 1). Le back-office est l'interface
> d'administration web de la plateforme **PDF Formation**.

---

## 0. Décisions verrouillées

| Sujet | Décision |
| --- | --- |
| Stack | **Vite + React (SPA)** + TypeScript · React Router · TanStack Query · Zustand |
| MVP | Dashboard · Créer une formation · Ajouter un niveau · **Insérer de vrais fichiers PDF** par niveau · **Donner l'accès à un document** (cascade niveau + formation) |
| **Modèle « PDF »** | **B — Vrai fichier PDF** : upload `.pdf`, stockage, **streaming binaire authentifié** ⇒ **refonte du lecteur mobile** |
| Accès document | Donner un **document** ⇒ son **niveau** et sa **formation** deviennent **ouverts** |
| Utilisateurs | Champ **`active`** avec **soft-disable** (connexion/refresh bloqués, comptes & données conservés) |
| Backend | Extension **`/v1/admin`** + garde `ManagerGuard` |
| Identité visuelle | **Palette du mobile** (primary `#4F46E5`, accent `#0EA5A4`, light/dark) |

---

## 1. Contexte

Le backend NestJS est aujourd'hui **lecture seule / apprenant** (catalogue +
progression, zéro endpoint admin). Le back-office impose **d'étendre l'API** et
— à cause du choix « vrai PDF » — **de refondre le lecteur mobile** (qui affiche
aujourd'hui des blocs, pas un `.pdf`).

---

## 2. Modèle de domaine

| Entité | Collection | Contenu clé |
| --- | --- | --- |
| `User` | `users` | id, email, passwordHash, firstName, lastName, **role** (`LEARNER`/`MANAGER`), company, avatarColor, **`active`** *(nouveau)* |
| `RefreshToken` | `refresh_tokens` | hash(sha256), userId, expiresAt, revoked, replacedByHash |
| `Formation` | `formations` | id, name, description, category, icon, color, mandatory, order + compteurs |
| `Level` | `levels` | id, formationId, order, name, description + compteurs |
| `Document` | `documents` | id, levelId, formationId, order, title, description, pageCount, sizeKb, updatedAt, **`fileId` (GridFS)** *(remplace/cohabite avec `pages`)* |
| `File` (GridFS) | `fs.files`/`fs.chunks` | binaire `.pdf` + metadata (originalFilename, contentType, size, sha256) |
| `AccessGrant` | `access_grants` | userId, formationId, `levelIds[]`, **`documentIds[]`** *(nouveau)* |
| `DocumentProgress` | `document_progress` | userId, documentId, lastPage, pageCount, pagesRead[], percent, completed, updatedAt |

### Modèle d'accès (granularité : document, avec cascade)

> **Accorder un document ⇒ son niveau et sa formation deviennent accessibles.**

`AccessGrant` porte `formationId` + `levelIds[]` (vide = tous) + `documentIds[]`
(vide = tous les docs du niveau autorisé).

| Action utilisateur | Condition d'accès |
| --- | --- |
| Voir/déverrouiller une formation | grant formation **OU** un doc octroyé dans cette formation |
| Déverrouiller un niveau | grant formation/level **OU** un doc octroyé dans ce niveau |
| **Lire un document / le stream** | grant formation+level **OU** `documentIds` contient le doc |
| Lire le contenu (`/stream`) | toujours soumis au droit **document** (403 sinon) |

Back-office « Donner l'accès » ⇒ `AccessGrant` fusionné
`{ userId, formationId, levelIds:[niveau], documentIds:[doc] }`.

---

## 3. Périmètre MVP

1. **Tableau de bord** : nb apprenants actifs, nb formations, nb documents, taux
   de complétion par formation, progression globale, formations obligatoires.
2. **Formations** : créer / éditer (nom, description, catégorie, icône, couleur,
   obligatoire, ordre), recalcul des compteurs.
3. **Niveaux** : ajouter / éditer un niveau rattaché à une formation.
4. **Documents / PDF** : insérer un document pour un niveau + **upload du `.pdf`**.
5. **Accès** : donner un document à un utilisateur (cascade), révoquer, vue « qui a accès à quoi ».

**Hors MVP** : gestion avancée des utilisateurs (création/édition), exports
CSV/Excel, logs & audit, versioning/publication.

---

## 4. Architecture technique

### 4.1 Backend — vrais fichiers PDF (choix B)

**Stockage**
- **GridFS (MongoDB)** via `mongoose` `GridFSBucket` : le binaire reste dans la
  même base, aucun service externe, compatible docker-compose. Alternative
  production : volume/object storage (S3). *(Recommandé : GridFS pour la cohérence.)*
- `Document` référence `fileId` (GridFS id) + `sizeKb` dérivé du fichier +
  `pageCount` calculé à l'upload (pdf-lib / pdf-parse).

**Routes**
| Endpoint | Méthode | Description |
| --- | --- | --- |
| `/admin/documents` | POST | Créer un document (multipart + fichier) |
| `/admin/documents/:id/content` | PUT | Remplacer le `.pdf` d'un document |
| `/admin/documents/:id` | PATCH/DELETE | Métadonnées / suppression (purge GridFS) |
| `/documents/:id/stream` | GET | **Renvoie le binaire PDF** (Content-Type `application/pdf`, `no-store`) au lieu des blocs |

**Sécurité**
- Garde `DocumentAccessGuard` conservée (403 sans droit document/formation/niveau).
- **Aucune URL publique** : le binaire n'est servi que par l'endpoint authentifié.
- `Cache-Control: no-store` conservé. Blocage capture écran géré côté mobile.

### 4.2 Mobile — refonte du lecteur (conséquence de B)

> C'est le **point le plus impactant** : le mobile ne rend plus des blocs `PdfBlock`
> mais un vrai PDF.

- **Rendu** : remplacer `PdfReaderScreen` (blocs via `PdfPageView`) par un lecteur
  PDF natif. Points d'entrée pour Expo SDK 57 : `react-native-pdf` (WebView/native),
  ou WebView avec fetch du binaire. Le PDF est récupéré via l'endpoint authentifié
  (blob) puis affiché — **jamais** via une URL publique.
- **Progression** : conserver le suivi par page. Le lecteur doit exposer un callback
  « page courante » (ex. `onPageChanged`) → `progressionStore.trackPage(...)`
  (pageCount = nombre de pages réelles du PDF).
- **Sécurité** : conserver `useScreenCaptureProtection()` (global + lecteur).
- **Catalogue/métadonnées** : `documentApi.stream()` change de contrat (binaire au
  lieu de `{ documentId, pages }`). Adapter `http-client` (responseType arraybuffer).

> ⚠️ Ce changement est **substantiel** et touche au cœur de la sécurité. Il devra
> être mené avec précaution (tests + release).

### 4.3 Back-office (Vite + React)

- **Routing** : React Router ; layout avec sidebar (Dashboard, Formations, Niveaux,
  Documents/PDF, Accès).
- **Données** : TanStack Query (cache serveur) + Zustand (session/UI).
- **HTTP** : client avec intercepteur JWT + refresh + rejeu 401 (logique reprise de
  `mobile/src/core/api/http-client.ts`). Upload multipart pour les fichiers.
- **UI** : palette du mobile, tables/DataGrid, formulaires contrôlés, drag & drop
  PDF (react-dropzone), éditeur de formation/niveau.
- **Contrôle d'accès front** : login via `/auth/login` ; exiger
  `user.role === 'MANAGER'` (sinon refuser). Routes `/v1/admin/*` doublement
  protégées côté serveur.

---

## 5. Extension backend NestJS (`/v1/admin`)

Garde `ManagerGuard` (403 si `role !== 'MANAGER'`), DTO dédiés.

| Ressource | Méthodes | Description |
| --- | --- | --- |
| `/admin/users` | GET/POST | Liste / création + champ `active` |
| `/admin/users/:id` | GET/PATCH | Détail / édition + **soft-disable** |
| `/admin/access` | GET | Liste des grants |
| `/admin/access` | POST | **Donner accès à un document** (cascade) |
| `/admin/access/:grantId` | DELETE | Révocation |
| `/admin/formations` | GET/POST/PATCH/DELETE | CRUD formations |
| `/admin/formations/:id/levels` | GET/POST | Niveaux |
| `/admin/levels/:id` | PATCH/DELETE | Niveau |
| `/admin/levels/:id/documents` | GET/POST | Documents (upload `.pdf`) |
| `/admin/documents/:id` | GET/PATCH/DELETE | Document (+ purge GridFS) |
| `/admin/documents/:id/content` | PUT | Remplacer le PDF |
| `/admin/stats` | GET | Agrégations dashboard |

### Points de vigilance
- **`active`** : bloquer `login` & `refresh` si `active === false` (champ nullable,
  ne casse pas le mobile ni les comptes seed).
- **Garde admin** : refuser les routes `/admin/*` aux `LEARNER`.
- **FK & idempotence** : valider `formationId/levelId/userId`, fusionner les grants
  (couple user/formation) sans doublon.
- **Mots de passe** : `scrypt` (réutiliser `password.util.ts`), jamais renvoyer
  `passwordHash`.
- **Contenu** : upload → `pageCount`/`sizeKb`/`durationMinutes`/`totalPages`
  recalculés ; validation du type MIME (`application/pdf`), limite de taille,
  purge GridFS à la suppression.
- **Streaming binaire** : adapter `DocumentAccessGuard` (droits par document) et le
  `http-client` mobile (arraybuffer).

---

## 6. Parcours utilisateur (écrans)

```
Login (role MANAGER requis)
        │
        ▼
Layout admin (sidebar)
 ├─ Tableau de bord          [MVP]
 ├─ Formation (liste + créer)
 ├─ Niveau (ajouter à une formation)
 ├─ Documents / PDF (upload par niveau)
 ├─ Accès (donner un document à un utilisateur)
 └─ (plus tard) Utilisateurs · Progression · Logs
```

**Écran clé — Donner l'accès à un document :** choisir utilisateur → formation →
niveau → document → sauver. Le serveur crée/fusionne le grant ; la formation et le
niveau s'ouvrent automatiquement.

---

## 7. État & décisions

**Verrouillé :** Vite+React, MVP (dashboard + formation + niveau + **vrai PDF** +
accès document), extension backend, `active` soft-disable, palette mobile.

**Principaux risques / à cadrer :**
- Refonte du **lecteur mobile** (rendu PDF natif + streaming binaire) — le plus
  risqué ; à traiter en priorité avec des tests.
- Choix **GridFS vs volume/S3** pour l'hébergement des PDF en prod.
- Montée en charge du streaming binaire (cache, range requests).

---

## 8. Avancement

| Phase | État | Contenu |
| --- | --- | --- |
| **1 — Backend `/v1/admin`** | ✅ Fait | `active` (soft-disable), `documentIds[]`, garde `ManagerGuard`, CRUD users/accès/formations/niveaux/documents, **upload PDF** (volume `UPLOAD_DIR` + comptage pages), `/stream` binaire, stats. Validé (typecheck + build + `npm run test:access`). |
| **2 — Lecteur mobile vrais PDF** | ✅ Fait | `httpClient.getBinary` (jeton + rejeu 401), `documentApi.stream` → `{ kind: 'pdf' \| 'blocks' }`, `pdfReaderStore` gère les deux modes, `PdfViewer.native.tsx` (react-native-pdf, base64, `onPageChanged`) + `PdfViewer.web.tsx` (iframe/Blob) + fallback. Validé (typecheck + `expo export --platform web`). |
| **3 — Back-office Vite + React** | ✅ Fait | Vite 6 + React 18 + TS, React Router, TanStack Query, Zustand. Auth MANAGER (login + garde), layout sidebar, écrans Tableau de bord / Formations / Niveaux / Documents-PDF / Accès, branchés sur `/v1/admin/*`. Validé (typecheck + build + preview). |

### ⚠️ Notes Phase 2
- **`react-native-pdf`** est un module natif : le rendu PDF natif nécessite un
  **development build** (pas Expo Go). Sur **web**, le rendu utilise le lecteur
  du navigateur (`<iframe>` + Blob), sans suivi de page automatique (les boutons
  préc./suiv. pilotent la position), à améliorer plus tard avec PDF.js.
- En **mode mock** (backend simulé), les documents restent des **blocs** : le
  lecteur bascule automatiquement (aucune régression).
- Les fichiers PDF importés via le back-office ne s'afficheront en vrais PDF sur
  mobile qu'avec un **development build** (voir ci-dessus).
