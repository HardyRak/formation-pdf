import { useColorScheme } from 'react-native';

export interface Palette {
  mode: 'light' | 'dark';
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  paper: string;
  paperText: string;
  paperMuted: string;
}

const light: Palette = {
  mode: 'light',
  bg: '#F4F5FB',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0FA',
  border: '#E2E5F1',
  text: '#111634',
  textMuted: '#5A6183',
  textFaint: '#8D94B4',
  primary: '#4F46E5',
  primarySoft: '#EAE8FF',
  primaryText: '#FFFFFF',
  accent: '#0EA5A4',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  overlay: 'rgba(12,14,32,0.55)',
  paper: '#FFFFFF',
  paperText: '#16192E',
  paperMuted: '#5B6178',
};

const dark: Palette = {
  mode: 'dark',
  bg: '#0A0D1C',
  bgElevated: '#121734',
  surface: '#141A38',
  surfaceAlt: '#1B2247',
  border: '#242C58',
  text: '#F2F4FF',
  textMuted: '#A9B0D6',
  textFaint: '#727BA8',
  primary: '#7C7BFF',
  primarySoft: '#242C6B',
  primaryText: '#FFFFFF',
  accent: '#2DD4BF',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  overlay: 'rgba(3,5,15,0.7)',
  paper: '#F7F7FB',
  paperText: '#14172B',
  paperMuted: '#5B6178',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 };

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export const shadow = (elevation = 6) => ({
  shadowColor: '#0B1030',
  shadowOpacity: 0.12,
  shadowRadius: elevation * 1.6,
  shadowOffset: { width: 0, height: elevation / 1.6 },
  elevation,
});

export const palettes = { light, dark };
