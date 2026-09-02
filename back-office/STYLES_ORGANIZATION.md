# Styles Organization — Back-office (1 composant = 1 fichier + 1 fichier de styles)

Convention identique au mobile (`../mobile/STYLES_ORGANIZATION.md`), adaptée
React DOM (pas de `StyleSheet`, objets `CSSProperties`).

## Règles

1. **Un fichier `.tsx` = un seul composant exporté.**
2. **Chaque composant qui porte des styles a son fichier dédié**
   `Composant.styles.ts` à côté de `Composant.tsx`.
3. Le `.styles.ts` ne contient que des **styles statiques**
   (`export const styles = { … }` typés `CSSProperties`).
4. Les valeurs **dynamiques** (couleur passée en prop, largeur de barre,
   opacité selon `disabled`, `isActive` d'un NavLink…) restent inline dans le
   `.tsx`.
5. Une base partagée de contrôle de saisie vit dans
   `components/inputControl.styles.ts` (importée par TextField / TextArea /
   Select) — pas de duplication.
6. Un composant purement délégant (ex. `ConfirmButton`, `FilePickerButton`,
   `QueryGate`) n'a pas de fichier de styles tant qu'il n'en porte aucun.

## Structure

```
src/components/
  Button.tsx            Button.styles.ts
  Card.tsx              Card.styles.ts
  …
  index.ts              (barrel : import { Button, Card } from '../components')

src/pages/
  LoginPage.tsx         LoginPage.styles.ts
  …
```

## Vérifications

- `npm run typecheck` et `npm run build` doivent passer.
- Tout `.tsx` de `components/` et `pages/` exporte exactement un composant.
