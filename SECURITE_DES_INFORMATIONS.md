# Sécurité des informations - Contrôle d'accès

## Principe

> Toutes les formations existantes sont affichées et reçues par l'utilisateur, mais seul s'il a l'accès à la formation. Les formations sont grisées et avec une icône de cadenas. Même principe pour les niveaux dans une formation.

Cette fonctionnalité implémente un contrôle d'accès côté client (mock) qui simule une vraie politique de sécurité où :
- Le backend retourne **tout le catalogue** (toutes les formations existent)
- Le frontend filtre l'accès et affiche l'état verrouillé

## Architecture

### Module de sécurité

`src/core/security/access.ts`

```ts
// Mapping des accès par utilisateur
const FORMATION_ACCESS = {
  'usr-1': ['f-hse', 'f-cyber', 'f-angular'], // Sophie : 3/4
  'usr-2': ['f-angular', 'f-hse', 'f-cyber', 'f-manag'], // Karim : tout
}

const LEVEL_ACCESS = {
  'usr-1': {
    'f-hse': ['l-hse-1', 'l-hse-2', 'l-hse-3'], // complet
    'f-cyber': ['l-cyb-1'], // seulement niveau 1
    'f-angular': ['l-ang-1', 'l-ang-2'], // 2/3
  },
  'usr-2': { /* tout */ }
}
```

Fonctions :
- `hasFormationAccess(userId, formationId): boolean`
- `hasLevelAccess(userId, formationId, levelId): boolean`
- `getAccessibleFormations(userId): string[]`
- `getLockedFormations(userId, allIds): string[]`
- `getAccessDeniedMessage(type)`

### UI - Formations

**`FormationCard`**
- Prop `locked?: boolean`
- Si `locked` :
  - `opacity: 0.62` + `cardLocked` style
  - Icône `lock-closed` à la place de l'icône formation
  - Badge cadenas en haut à droite
  - Chip `Accès restreint` + message "Accès restreint — contactez votre responsable"
  - Pas de `ProgressBar`, pas de checkmark
  - `accessibilityLabel` avec " - verrouillée"

**`FormationsScreen`**
- Calcule `accessibleCount` / `lockedCount`
- Affiche compteur "X accessibles • Y verrouillées 🔒"
- `renderItem` passe `locked={!hasFormationAccess(userId, formation.id)}`
- `openFormation` vérifie l'accès avant navigation :
  - Si verrouillé → `Alert.alert('Accès restreint 🔒', getAccessDeniedMessage('formation'))`
  - Propose "Voir profil"

### UI - Niveaux

**`LevelsScreen`**
- Vérifie `formationHasAccess = hasFormationAccess(userId, formationId)`
- Header affiche cadenas si formation verrouillée
- `SummaryCard` affiche message si formation verrouillée
- Chaque niveau :
  - `hasAccess = hasLevelAccess(userId, formationId, levelId)`
  - Si verrouillé : opacity 0.62, step gris avec cadenas, badge cadenas, texte "Verrouillé 🔒"
  - `handleLevelPress` vérifie l'accès avant navigation vers Documents
  - Alert différenciée : "Formation verrouillée" vs "Niveau verrouillé"

### UI - Profil

**`ProfileScreen`**
- Nouvelle section "Sécurité des informations 🔒"
- Affiche pour chaque formation :
  - Icône colorée si accessible, grise + cadenas si verrouillée
  - Badge checkmark vs cadenas
  - Compteur "X/Y formations accessibles"
- Message explicatif : "Toutes les formations sont affichées mais grisées avec un cadenas 🔒 si vous n'avez pas l'accès. Même principe pour les niveaux"

## Comptes de test

- **Sophie Martin** `sophie.martin@pdftrain.io / demo1234` (LEARNER) :
  - Formations accessibles : HSE, Cyber, Angular (3/4)
  - Formation verrouillée : Management (grisée + cadenas)
  - Niveaux : HSE complet, Cyber seulement niveau 1, Angular 2/3

- **Karim Benali** `karim.benali@pdftrain.io / manager2024` (MANAGER) :
  - Accès complet à tout

## Sécurité réelle

Dans la simulation actuelle, le backend mock (`src/core/api/backend/server.ts`) retourne toutes les formations sans filtrer. En production :
- Le backend NestJS devrait filtrer `/formations` selon `userId`
- Ou retourner toutes avec un champ `hasAccess`
- Et protéger `/formations/:id/levels` et `/documents/:id/stream` avec 403 si pas d'accès

Le frontend actuel simule déjà le 403 via `Alert` avant navigation.

## Branches

- `securite-des-informations` (ASCII, recommandée)
- `sécurité-des-informations` (avec accent, alias)

Basée sur `main` après refactor des styles (`81436e1`).
