# PDF Formation — Backend (NestJS + MongoDB)

API backend de l'application **PDF Formation** (voir `../mobile`). Elle remplace le
« backend simulé » embarqué dans le mobile (`mobile/src/core/api/backend/`).

## Stack

- **Node.js** + **NestJS 10** (TypeScript)
- **MongoDB** via **Mongoose** (`@nestjs/mongoose`)
- Auth : **JWT** (`@nestjs/jwt`) + mots de passe hachés avec **scrypt** (natif Node)
- Rate-limiting : `@nestjs/throttler` (anti force brute sur `/auth/login`)

## Démarrage rapide

```bash
# 1. Dépendances
npm install

# 2. Configuration
cp .env.example .env   # puis adapter les valeurs

# 3. Base de données (Docker) — ou utiliser un MongoDB existant
docker compose up -d

# 4. Peupler la base (formations, niveaux, documents, comptes de démo)
npm run seed

# 5. Lancer l'API (http://localhost:3000/v1)
npm run start:dev
```

Vérification : `GET http://localhost:3000/v1/health` → `{ "status": "ok", … }`.

## Variables d'environnement

Toute la configuration passe par `.env` (voir `.env.example`). Rien n'est codé
en dur dans le code métier — les valeurs sont centralisées dans
`src/config/configuration.ts` et validées au démarrage par
`src/config/env.validation.ts` (Joi, fail-fast).

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `PORT` | Port HTTP | `3000` |
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
| `/documents/:id/stream` | GET | ✅ + ACL | Contenu paginé (jamais d'URL publique) |
| `/health` | GET | ❌ | Healthcheck |

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
| `users` | `_id` = `usr-1` | Comptes + `passwordHash` |
| `refresh_tokens` | `_id` = sha256(jeton) | Jetons de rafraîchissement (rotation/révocation) |
| `formations` | `_id` = `f-hse` | Métadonnées + compteurs pré-calculés |
| `levels` | `_id` = `l-hse-1` | Niveaux |
| `documents` | `_id` = `doc-hse-101` | Documents + pages embarquées |
| `access_grants` | `_id` = `usr:f` | Droits d'accès (learners) |

Les identifiants métier (`f-hse`, `l-hse-1`, `doc-hse-101`) sont conservés pour
rester compatibles avec le client mobile.

## Sécurité

- **Mots de passe** : hachés avec `scrypt` (salt aléatoire, comparaison à temps constant) — jamais en clair.
- **Access token** : JWT court (15 min), `typ: access`, signé HS256.
- **Refresh token** : opaque (192 bits), stocké **haché** (sha256), **rotation** à chaque usage, révocation au logout.
- **Contrôle d'accès serveur** : les métadonnées du catalogue sont visibles (affichage grisé côté client), mais le **contenu** (`/documents/*`, `/stream`) renvoie **403** sans droit. Les managers ont un accès total.
- **Anti-cache** sur `/stream` (`Cache-Control: no-store`).
- **Rate-limiting** global + renforcé sur `/auth/login`.

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
├── config/                 # configuration .env + validation Joi
├── common/                 # contrats DTO, ApiException, filtre d'erreurs, décorateurs
├── health/                 # healthcheck
├── users/                  # schéma User
├── auth/                   # login/refresh/me/logout, JWT, guard, hash mots de passe
├── access/                 # ACL serveur (service + schéma access_grants)
├── catalog/                # formations / niveaux / documents (+ guards d'accès)
└── seed/                   # seed depuis le catalogue mobile (script standalone)
```
