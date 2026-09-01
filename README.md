# formation-pdf

Monorepo de la plateforme **PDF Formation** — bibliothèque de formation sécurisée.

## Structure

| Dossier        | Rôle                          | Stack                                   |
| -------------- | ----------------------------- | --------------------------------------- |
| `mobile/`      | Application mobile (iOS / Android / Web) | Expo SDK 57 · React Native · TypeScript |
| `back/`        | API backend                   | Node.js · NestJS · MongoDB (Mongoose)   |
| `back-office/` | Interface d'administration web | À définir                               |

## Démarrage

- **Mobile** : `cd mobile && npm install && npm start`
- **Backend** : `cd back` (scaffolding à venir)
- **Back-office** : `cd back-office` (à venir)

## Environnement

Les variables d'environnement sont gérées via des fichiers `.env` locaux, **jamais commités**.
Chaque projet fournit un exemple versionné (`.env.example`).

## Licence

Voir [LICENSE](./LICENSE).
