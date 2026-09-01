# Styles Organization - 1:1 Component/Style Pattern

This document explains the styling architecture adopted in the project: **one component file paired with one dedicated style file**.

## Philosophy

- **Separation of concerns**: Component logic (JSX, state, hooks) is separated from styling definitions.
- **Readability**: Each `*.tsx` file focuses on behavior and rendering, while `*.styles.ts` contains only `StyleSheet.create` definitions.
- **Maintainability**: Styles are easier to locate, review, and refactor when co-located but isolated.
- **Consistency**: Enforces a predictable project structure across the codebase.

## Pattern

For every UI component or screen:

```
ComponentName.tsx        -> Component logic
ComponentName.styles.ts  -> StyleSheet definitions
```

Example (current structure after reorg):

```
src/components/Button.tsx
src/components/Button.styles.ts

src/pages/FormationsScreen.tsx
src/pages/FormationsScreen.styles.ts
```

Legacy example (before reorg):

```
src/ui/components/Button.tsx
src/ui/components/Button.styles.ts

src/features/formations/FormationsScreen.tsx
src/features/formations/FormationsScreen.styles.ts
```

### Component file (`*.tsx`)

- Imports styles: `import { styles } from './ComponentName.styles';`
- No `StyleSheet.create` inline.
- Keeps only dynamic styles (theme-dependent colors, conditional styles) inline where needed.
- Imports `useTheme`, `shadow`, etc. for runtime theming.

```tsx
import { styles } from './Button.styles';
import { useTheme, shadow } from '../../core/theme/theme';

export function Button({ label, onPress }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.base, { backgroundColor: theme.primary }, shadow(4)]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
```

### Style file (`*.styles.ts`)

- Contains only static styles.
- Imports `StyleSheet` from `react-native` and design tokens (`radius`, `spacing`) from `../../core/theme/theme` if needed.
- Exports a `styles` object.

```ts
import { StyleSheet } from 'react-native';
import { radius, spacing } from '../../core/theme/theme';

export const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
  },
});
```

## Coverage

### Components (`src/components` - after reorg, previously `src/ui/components` + reusable feature components)

- `AnimatedCard.styles.ts`
- `Button.styles.ts`
- `Chip.styles.ts`
- `FormationCard.styles.ts`
- `PdfPageView.styles.ts`
- `ProgressBar.styles.ts`
- `ScreenHeader.styles.ts`
- `SearchBar.styles.ts`
- `StateViews.styles.ts`
- `SummaryCard.styles.ts`
- `TextField.styles.ts`
- `UserAvatar.styles.ts`

### Pages / Screens (`src/pages` - after reorg, previously `src/features/*` + navigation)

- `DiagnosticsScreen.styles.ts`
- `DocumentsScreen.styles.ts`
- `FormationsScreen.styles.ts`
- `LevelsScreen.styles.ts`
- `LoginScreen.styles.ts`
- `PdfReaderScreen.styles.ts`
- `ProfileScreen.styles.ts`
- `ProgressScreen.styles.ts`
- `RootNavigator.styles.ts` (in `src/navigation/`)

## Benefits

1. **Faster code reviews**: Style changes are isolated in `.styles.ts` diffs.
2. **Reduced merge conflicts**: Logic and style edits rarely collide.
3. **Theming ready**: Dynamic theme values stay in the component, static layout stays in the style file.
4. **Scalability**: Adding a new component automatically follows the same convention.

## Guidelines

- Always create a `.styles.ts` file alongside a new component if it needs styles.
- Never define `StyleSheet.create` inside the `.tsx` file.
- Keep dynamic, theme-dependent values (e.g., `backgroundColor: theme.surface`) inline in the component, not in the static style file.
- Import only `radius`, `spacing` in style files when needed for static layout; avoid importing `useTheme`.
- Name the export consistently: `export const styles = StyleSheet.create({...})`.

## Migration

The refactoring was done in two steps:

1. `refactor: separate component styles into dedicated .styles.ts files`
2. `refactor: separate page styles into dedicated .styles.ts files`

This document was added as:

3. `docs: add STYLES_ORGANIZATION.md explaining the 1:1 component/style pattern`

---

This pattern ensures a clean, predictable, and maintainable codebase for all current and future screens and components.
