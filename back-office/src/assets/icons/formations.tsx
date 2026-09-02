import type { ReactNode } from 'react';

/**
 * Banque d'icônes de formation.
 *
 * Les clés reprennent les noms **Ionicons** (utilisés par l'app mobile via
 * `@expo/vector-icons`) afin qu'une formation créée au back-office s'affiche
 * correctement sur mobile. Côté web, le rendu est un SVG « trait » inline
 * (currentColor) — aucun fichier `.svg` ni masque CSS.
 */
export type FormationIconName =
  | 'library'
  | 'book'
  | 'school'
  | 'people'
  | 'shield-checkmark'
  | 'lock-closed'
  | 'key'
  | 'phone-portrait'
  | 'laptop'
  | 'hardware-chip'
  | 'briefcase'
  | 'rocket'
  | 'warning'
  | 'flame'
  | 'heart-pulse'
  | 'nutrition'
  | 'leaf'
  | 'water'
  | 'trash'
  | 'accessibility'
  | 'trophy'
  | 'time'
  | 'document-text'
  | 'folder'
  | 'clipboard'
  | 'globe'
  | 'bar-chart'
  | 'settings'
  | 'construct'
  | 'car'
  | 'megaphone'
  | 'chatbubbles';

/** Contenu SVG (trait, viewBox 24×24) de chaque icône. */
const GLYPHS: Record<FormationIconName, ReactNode> = {
  library: (
    <>
      <rect x="3.5" y="4" width="3.2" height="16" rx="1" />
      <rect x="8.6" y="4" width="3.2" height="16" rx="1" />
      <path d="M14.5 4.8 18 4.2a.9.9 0 0 1 1 .8l2.2 12.6a.9.9 0 0 1-.7 1L17 19.4" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.2 5.3 8 4.7 5 4.7v13c3 0 5.2.6 7 1.8 1.8-1.2 4-1.8 7-1.8v-13c-3 0-5.2.6-7 1.8Z" />
      <path d="M12 6.5v13" />
    </>
  ),
  school: (
    <>
      <path d="M22 9 12 4 2 9l10 5 10-5Z" />
      <path d="M6 11.5V16c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.5" />
      <path d="M22 9v5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.2 2.5-6 5.5-6s5.5 2.8 5.5 6" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14.4c2 .6 3.5 2.4 3.5 5.1" />
    </>
  ),
  'shield-checkmark': (
    <>
      <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />
      <path d="m9 11.8 2 2 4-4.2" />
    </>
  ),
  'lock-closed': (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4" />
      <path d="m10.8 12.7 7.4-7.4M15.8 5.3l2 2M13.8 7.3l2 2" />
    </>
  ),
  'phone-portrait': (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  laptop: (
    <>
      <rect x="4" y="5" width="16" height="10" rx="1.5" />
      <path d="M2 20h20" />
    </>
  ),
  'hardware-chip': (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10.5 3v3M13.5 3v3M10.5 18v3M13.5 18v3M3 10.5h3M3 13.5h3M18 10.5h3M18 13.5h3" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6.5A2 2 0 0 1 10 4.5h4a2 2 0 0 1 2 2V8M3 13.5h18" />
    </>
  ),
  rocket: (
    <>
      <path d="M5 15c-1.4 1.4-1.8 4.6-1.8 4.6s3.2-.4 4.6-1.8c.8-.8.8-2 0-2.8s-2-.8-2.8 0Z" />
      <path d="M9.5 12.5C10.5 7.5 14.5 4.5 20.5 3.5c-1 6-4 10-9 11l-2-2Z" />
      <circle cx="15" cy="9" r="1.4" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 9.5v4.5M12 17.2h.01" />
    </>
  ),
  flame: (
    <path d="M12 2.5c1 4-4 5-4 9a4.5 4.5 0 0 0 9 0c0-2-1-3.5-2-4.5.2 1.5-.8 2.5-1.8 2.5C12.5 7 13 4.5 12 2.5Z" />
  ),
  'heart-pulse': (
    <>
      <path d="M12 20.5S3.5 15.5 3 9.8C2.7 6.7 5 4.5 7.8 4.5c1.8 0 3.2 1 4.2 2.5 1-1.5 2.4-2.5 4.2-2.5 2.8 0 5.1 2.2 4.8 5.3-.5 5.7-9 10.7-9 10.7Z" />
      <path d="M3.5 12h4l1.5-3 2.5 5.2 2-3.7h4" />
    </>
  ),
  nutrition: (
    <>
      <path d="M7 8h10l-1 12.2H8L7 8Z" />
      <path d="M6.5 8h11M10.2 3.8 9.2 8M16.8 4.5 14.5 6.8" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16Z" />
      <path d="M4 20c3.5-5.5 8-8.5 12.5-10.5" />
    </>
  ),
  water: <path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l1 13h9l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  accessibility: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M5 9h14M12 9v5.5M9 20l3-6.5L15 20" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.5H5.5V7a3 3 0 0 0 2.8 3M16 5.5h2.5V7a3 3 0 0 1-2.8 3M12 13v3M9.5 19.5h5M10 16h4v3.5h-4z" />
    </>
  ),
  time: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  'document-text': (
    <>
      <path d="M6 2h8.5L20 7.5V22H6V2Z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </>
  ),
  folder: (
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3.8a1.5 1.5 0 0 1 1.1.4l1.3 1.3h8.3a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4.5 17.5v-11Z" />
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4a3 3 0 0 1 6 0M9.5 11.5h5M9.5 15h3.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18-2.6-2.6-2.6-15.4 0-18Z" />
    </>
  ),
  'bar-chart': <path d="M4 20V4M4 20h16M8 16v-4M12.5 16V8M17 16v-6" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
    </>
  ),
  construct: (
    <path d="M14.6 6.6a3.6 3.6 0 0 0-4.8 4.4L3.2 17.6l3.2 3.2 6.6-6.6a3.6 3.6 0 0 0 4.4-4.8l-2.6 2.6-2.4-.7-.7-2.4 2.9-2.3Z" />
  ),
  car: (
    <>
      <path d="M5 13l1.4-4.3A2 2 0 0 1 8.3 7.2h7.4a2 2 0 0 1 1.9 1.5L19 13M4 13h16v3.8a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-.8H7v.8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V13Z" />
      <circle cx="7.6" cy="15.6" r="0.6" />
      <circle cx="16.4" cy="15.6" r="0.6" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3.5 10.2v3.6a1 1 0 0 0 1 1h1.8l5 3.6V5.6l-5 3.6H4.5a1 1 0 0 0-1 1Z" />
      <path d="M15 8.5a4.5 4.5 0 0 1 0 7M18 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  chatbubbles: <path d="M4 5h16v10.5H9l-4 3.5V5Z" />,
};

/** Liste ordonnée des clés d'icônes disponibles (pour le sélecteur). */
export const FORMATION_ICON_NAMES = Object.keys(GLYPHS) as FormationIconName[];

/** Rendu d'une icône de formation (trait, couleur passée en prop). */
export function FormationGlyph({
  name,
  color = 'currentColor',
  size = 20,
  strokeWidth = 1.8,
}: {
  name: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const glyph = GLYPHS[name as FormationIconName] ?? GLYPHS.library;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {glyph}
    </svg>
  );
}
