import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    primary: '#6366F1',
    agree: '#10B981',
    agreeLight: '#ECFDF5',
    agreeBorder: '#6EE7B7',
    agreeText: '#059669',
    disagree: '#F43F5E',
    disagreeLight: '#FFF1F2',
    disagreeBorder: '#FCA5A5',
    disagreeText: '#E11D48',
    trending: '#F59E0B',
    trendingLight: '#FEF3C7',
    trendingText: '#92400E',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceAlt: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
  },
  dark: {
    primary: '#818CF8',
    agree: '#34D399',
    agreeLight: '#022C22',
    agreeBorder: '#065F46',
    agreeText: '#34D399',
    disagree: '#FB7185',
    disagreeLight: '#2D0A14',
    disagreeBorder: '#9F1239',
    disagreeText: '#FB7185',
    trending: '#FCD34D',
    trendingLight: '#2D1B00',
    trendingText: '#FCD34D',
    background: '#0F0F10',
    surface: '#1A1A1E',
    surfaceAlt: '#242428',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#2D2D35',
    borderStrong: '#3D3D47',
  },
} as const;

export type AppColors = typeof Colors.light;
export type ColorScheme = 'light' | 'dark';

export function useColors(): AppColors {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
