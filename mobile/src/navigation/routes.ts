/** Source de vérité des routes — utilisée par le navigateur et les tests. */
export const ROUTE_NAMES = ['Login', 'Tabs', 'Levels', 'Documents', 'Reader', 'Diagnostics'] as const;
export type RouteName = (typeof ROUTE_NAMES)[number];
