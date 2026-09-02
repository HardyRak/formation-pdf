# PDF Formation — Back-office (Vite + React)

Interface d'administration web de la plateforme **PDF Formation** (voir
`../README.md`). Elle pilote le contenu et les accès via les endpoints
`/v1/admin/*` du backend NestJS (`../back/`).

## Stack

- **Vite 6** + **React 18** + **TypeScript**
- **React Router 6** (navigation)
- **TanStack Query 5** (cache serveur) + **Zustand 5** (session)
- Client HTTP avec jeton JWT + refresh + rejeu 401 (équivalent du client mobile)

## Démarrage

```bash
cd back-office
npm install
cp .env.example .env   # adapter VITE_API_URL si besoin
npm run dev            # http://localhost:5173
```

Le proxy Vite redirige `/v1` vers le backend (par défaut `http://localhost:3000`),
donc le back-office ne dépend pas de CORS : il suffit que le backend `back/`
soit démarré.

> Lancement du backend : voir `../back/README.md` (le plus simple :
> `docker compose up -d`, ou `npm run start:dev` avec un MongoDB local).

## Accès

Le back-office est réservé aux comptes **MANAGER** (responsable de formation).

| Rôle | Email | Mot de passe (après seed) |
| --- | --- | --- |
| MANAGER | `karim.benali@pdftrain.io` | `manager2024` |

Un apprenant (`LEARNER`) ne peut pas s'y connecter : le client refuse la session
et le serveur renvoie 403 sur `/v1/admin/*`.

## Écrans

| Route | Écran | Rôle |
| --- | --- | --- |
| `/login` | Connexion | Auth MANAGER |
| `/` | Tableau de bord | KPIs (`/admin/stats`) + complétion par formation |
| `/formations` | Formations | Liste / créer / éditer / supprimer |
| `/formations/:id/levels` | Niveaux | Liste / créer / éditer / supprimer |
| `/levels/:id/documents` | Documents | **Upload PDF** / télécharger / remplacer / supprimer |
| `/access` | Accès | **Donner un document** (cascade niveau + formation) / révoquer |

## Configuration

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `VITE_API_URL` | URL de base du backend (proxy Vite) | `http://localhost:3000` |

## Sécurité

- Jeton JWT stocké dans `localStorage` (web), refresh automatique, rejeu 401.
- Les routes `/v1/admin/*` sont protégées côté serveur par la garde `ManagerGuard`
  (403 si `role !== 'MANAGER'`).
- Le client vérifie `user.role === 'MANAGER'` avant d'autoriser la navigation.

## ⚠️ Notes

- Les **fichiers PDF** sont stockés dans `back/uploads/` (volume) et ne sont
  **jamais** servis via une URL publique : le back-office les télécharge via
  `/documents/:id/stream` (authentifié).
- Le backend doit être démarré pour que l'upload / l'affichage des données
  fonctionnent.
