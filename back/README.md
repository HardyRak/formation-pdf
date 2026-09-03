# PDF Formation — Backend (NestJS + MongoDB)

API backend de l'application **PDF Formation** (voir `../mobile`). Elle remplace le
« backend simulé » embarqué dans le mobile (`mobile/src/core/api/backend/`).

## Stack

- **Node.js** + **NestJS 10** (TypeScript)
- **MongoDB** via **Mongoose** (`@nestjs/mongoose`)
- Auth : **JWT** (`@nestjs/jwt`) + mots de passe hachés avec **scrypt** (natif Node)
- Rate-limiting : `@nestjs/throttler` (anti force brute sur `/auth/login`)

## Démarrage rapide

### Option A — tout en conteneurs (recommandé)

```bash
cd back
cp .env.example .env   # adapter si besoin
docker compose up -d   # MongoDB + seed (une fois) + API
```

`docker compose` lit automatiquement le fichier `.env` (variables `MONGO_*`,
`JWT_*`, `PORT`…). Au premier démarrage, le service `seed` réinitialise et
peuple la base, puis l'API démarre sur `http://localhost:3000/v1`.

- Re-seed : `docker compose up --force-recreate seed`
- Voir les logs : `docker compose logs -f api`

### Option B — développement local (backend sur la machine hôte)

```bash
cd back
npm install
cp .env.example .env
docker compose up -d mongo   # MongoDB seul (accessible sur MONGO_PORT)
npm run seed                 # peuple la base (via MONGO_HOST=localhost)
npm run start:dev            # API sur http://localhost:3000/v1
```

Vérification : `GET http://localhost:3000/v1/health` → `{ "status": "ok", … }`.

## Docker Compose

| Service | Rôle |
| --- | --- |
| `mongo` | Base MongoDB (volume `mongo-data`, healthcheck) |
| `seed`  | One-shot : réinitialise et peuple la base, puis s'arrête |
| `api`   | API NestJS (construite via `Dockerfile`), exposée sur `PORT` |

Dans le réseau Compose, MongoDB est joignable par les services `seed`/`api` via
le nom d'hôte `mongo` (la variable `MONGO_HOST` du `.env` est donc écrasée en
interne). Si `MONGO_USER`/`MONGO_PASSWORD` sont renseignés, l'authentification
Mongo est activée et le backend s'y connecte avec les mêmes identifiants.

## Variables d'environnement

Toute la configuration passe par `.env` (voir `.env.example`). Rien n'est codé
en dur dans le code métier — les valeurs sont centralisées dans
`src/config/configuration.ts` et validées au démarrage par
`src/config/env.validation.ts` (Joi, fail-fast).

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `PORT` | Port HTTP | `3000` |
| `TRUST_PROXY` | Autorise la lecture de `X-Forwarded-For` (IP client réelle dans les logs) derrière un reverse proxy | `false` |
| `MONGO_HOST` | Hôte MongoDB | `localhost` |
| `MONGO_PORT` | Port MongoDB | `27017` |
| `MONGO_DB` | Nom de la base | — (requis) |
| `MONGO_USER` | Utilisateur (vide = sans auth) | — |
| `MONGO_PASSWORD` | Mot de passe (vide = sans auth) | — |
| `MONGO_AUTH_SOURCE` | Base d'authentification | `admin` |
| `JWT_SECRET` | Secret de signature (≥ 16 car.) | — (requis) |
| `JWT_ACCESS_TTL` | Durée de vie access token (s) | `900` (15 min) |
| `JWT_REFRESH_TTL` | Durée de vie refresh token (s) | `604800` (7 j) |
| `CORS_ORIGINS` | Origines autorisées (virgules) | dev local |
| `UPLOAD_DIR` | Dossier de stockage des PDF (volume) | `uploads` |
| `MAX_UPLOAD_MB` | Taille max d'un upload PDF (Mo) | `50` |
| `LOG_BUFFER_SIZE` | Nombre de requêtes conservées dans le tampon des logs (`/logs`) | `1000` |

> L'URI MongoDB n'est **pas** définie directement : elle est construite à partir
> des variables ci-dessus (`mongodb://[user:password@]host:port/db[?authSource=…]`)
> dans `src/config/configuration.ts`. C'est la seule façon acceptée de configurer
> la connexion.

## Contrat d'API (préfixe global `/v1`)

Aligné sur le contrat déjà consommé par le mobile (`mobile/src/core/api/`).

| Endpoint | Méthode | Auth | Description |
| --- | --- | --- | --- |
| `/auth/login` | POST | ❌ | Connexion → `AuthSession` |
| `/auth/refresh` | POST | ❌ | Rafraîchit une session (rotation) |
| `/auth/me` | GET | ✅ | Profil de l'utilisateur |
| `/auth/me/access` | GET | ✅ | Droits d'accès (remplace le `access.ts` du mobile) |
| `/auth/logout` | POST | ✅ | Révoque les refresh tokens |
| `/formations` | GET | ✅ | Liste des formations (métadonnées) |
| `/formations/:id/levels` | GET | ✅ | Niveaux d'une formation (métadonnées) |
| `/levels/:levelId/documents` | GET | ✅ + ACL | Documents d'un niveau (403 si verrouillé) |
| `/documents/:id` | GET | ✅ + ACL | Métadonnées d'un document |
| `/documents/:id/stream` | GET | ✅ + ACL | **Binaire PDF** (si fichier importé) sinon blocs — jamais d'URL publique |
| `/progression` | GET | ✅ | Progression de lecture de l'utilisateur (tous documents) |
| `/progression/documents/:id` | PUT | ✅ | Upsert fusionné d'une progression (idempotent) |
| `/progression/documents/:id` | DELETE | ✅ | Efface la progression d'un document |
| `/progression` | DELETE | ✅ | Efface toute la progression de l'utilisateur |
| `/health` | GET | ❌ | Healthcheck |
| `/logs` | GET | ✅ + **MANAGER** | Journaux des requêtes HTTP (masqués) |
| `/admin/*` | variés | ✅ + **MANAGER** | Administration du back-office (voir §Admin) |

### Routes admin (`/v1/admin/*`) — réservées au rôle `MANAGER`

| Endpoint | Méthode | Description |
| --- | --- | --- |
| `/admin/users` | GET/POST | Liste / création de comptes (+ recherche, rôle) |
| `/admin/users/:id` | GET/PATCH | Détail / édition + **soft-disable** |
| `/admin/users/:id/active` | POST | Active / désactive un compte |
| `/admin/access` | GET/POST | Liste des grants / **donner l'accès à un document** (cascade niveau + formation) |
| `/admin/access/:userId/:formationId` | DELETE | Révoque l'accès à une formation |
| `/admin/access/document/:userId/:documentId` | DELETE | Retire l'accès à un document précis |
| `/admin/formations` | GET/POST/PATCH/DELETE | CRUD formations |
| `/admin/formations/:id/levels` | GET/POST | Niveaux d'une formation |
| `/admin/levels/:id` | PATCH/DELETE | Niveau |
| `/admin/levels/:id/documents` | GET/POST | Documents + **upload PDF** (multipart `file`) |
| `/admin/documents/:id` | GET/PATCH/DELETE | Document (+ purge du fichier) |
| `/admin/documents/:id/content` | PUT | **Remplacer le PDF** d'un document |
| `/admin/stats` | GET | Agrégations pour le tableau de bord |

### Format d'erreur

Toutes les erreurs sont normalisées par `ApiExceptionFilter` :

```json
{ "status": 401, "code": "INVALID_CREDENTIALS", "message": "Email ou mot de passe incorrect." }
```

Codes métier : `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `REFRESH_EXPIRED`,
`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`.

## Modèle de données

| Collection | Clé | Contenu |
| --- | --- | --- |
| `users` | `_id` = `usr-1` | Comptes + `passwordHash` + `active` (soft-disable) |
| `refresh_tokens` | `_id` = sha256(jeton) | Jetons de rafraîchissement (rotation/révocation) |
| `formations` | `_id` = `f-hse` | Métadonnées + compteurs pré-calculés |
| `levels` | `_id` = `l-hse-1` | Niveaux |
| `documents` | `_id` = `doc-hse-101` | Documents + pages embarquées (ou fichier PDF) |
| `access_grants` | `_id` = `usr:f` | Droits d'accès (learners) + granularité par document |
| `document_progress` | `_id` = `usr:doc` | Progression de lecture par utilisateur/document (synchronisée depuis le mobile) |

Les identifiants métier (`f-hse`, `l-hse-1`, `doc-hse-101`) sont conservés pour
rester compatibles avec le client mobile.

## Sécurité

- **Mots de passe** : hachés avec `scrypt` (salt aléatoire, comparaison à temps constant) — jamais en clair.
- **Access token** : JWT court (15 min), `typ: access`, signé HS256.
- **Refresh token** : opaque (192 bits), stocké **haché** (sha256), **rotation** à chaque usage, révocation au logout.
- **Contrôle d'accès serveur** : les métadonnées du catalogue sont visibles (affichage grisé côté client), mais le **contenu** (`/documents/*`, `/stream`) renvoie **403** sans droit. Les managers ont un accès total.
- **Accès par document** : un `AccessGrant` peut porter `documentIds[]`. Accorder un document ouvre aussi son **niveau** et sa **formation** (cascade). `levelIds:[]` = tous les niveaux, `documentIds:[]` = tous les documents du niveau.
- **Soft-disable** : un compte `active:false` ne peut plus se connecter ni rafraîchir sa session (403 `ACCOUNT_DISABLED`), ses données sont conservées.
- **PDF sur volume** : les `.pdf` importés sont écrits dans `UPLOAD_DIR` et ne sont servis QUE par `/documents/:id/stream` (jamais d'URL publique).
- **Anti-cache** sur `/stream` (`Cache-Control: no-store`).
- **Rate-limiting** global + renforcé sur `/auth/login`.
- **Journalisation enrichie** : chaque requête est tracée (console + tampon `/logs`) avec masquage des données sensibles (tokens, mots de passe, cookies, clés). En cas d'erreur (4xx / 5xx / exceptions inattendues), les logs sont automatiquement enrichis avec le type d'exception, le message technique réel, le code d'erreur, les paramètres de route/query, le corps de requête masqué, les détails de validation et la stack trace complète pour un débogage rapide.

## Comptes de démonstration (après `npm run seed`)

| Rôle | Email | Mot de passe | Accès |
| --- | --- | --- | --- |
| LEARNER | `sophie.martin@pdftrain.io` | `demo1234` | 3/4 formations, niveaux partiels |
| MANAGER | `karim.benali@pdftrain.io` | `manager2024` | Accès complet |

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run start:dev` | Démarre l'API en watch mode |
| `npm run build` | Compile dans `dist/` |
| `npm run start:prod` | Lance le build compilé |
| `npm run typecheck` | Vérification TypeScript seule |
| `npm run seed` | Réinitialise et peuple MongoDB |
| `npm run test` | Tests unitaires (Jest) — accès, progression |
| `npm run test:watch` | Tests unitaires en watch mode |
| `npm run test:cov` | Tests unitaires + couverture |
| `npm run test:access` | Valide la logique d'accès (cascade document → niveau → formation) |
| `npm run test:logs` | Valide l'enrichissement des logs et la capture d'erreurs détaillées |

## ⚠️ Adaptation nécessaire côté mobile

Le JWT signé par ce backend est un **JWT standard** : la claim `exp` est exprimée
**en secondes** (convention RFC 7519). Le mock mobile utilisait des millisecondes.
Au branchement du transport HTTP (voir la suite du chantier), il faudra adapter
`mobile/src/core/api/http-client.ts` (`isTokenExpired` : `payload.exp * 1000 <= Date.now()`).

## Structure

```
src/
├── main.ts                 # bootstrap (préfixe /v1, helmet, CORS, pipes, filtre)
├── app.module.ts           # module racine
├── config/                 # configuration .env + validation Joi + maskMongoUri
├── common/                 # contrats DTO, ApiException, filtre d'erreurs, décorateurs, id.util
├── health/                 # healthcheck
├── logs/                   # journalisation de chaque requête HTTP (console + /logs)
├── users/                  # schéma User (+ `active` soft-disable) + user.mapper
├── auth/                   # login/refresh/me/logout, JWT, guard, hash mots de passe
├── access/                 # ACL serveur (service + schéma access_grants)
├── catalog/                # formations / niveaux / documents (+ guards d'accès)
├── progression/            # progression de lecture persistée en base (sync mobile)
├── admin/                  # back-office : services focalisés (users/access/catalog/stats)
└── seed/                   # seed depuis le catalogue mobile (script standalone)
```
