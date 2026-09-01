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

## Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| LEARNER | `sophie.martin@pdftrain.io` | `demo1234` |
| MANAGER | `karim.benali@pdftrain.io` | `manager2024` |
