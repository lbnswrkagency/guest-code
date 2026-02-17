export const colors = {
  gold: '#d4af37',
  goldLight: '#ffc807',

  dark: {
    bg: '#000000',
    bgCard: '#111111',
    bgSurface: '#1a1a1a',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
  },

  light: {
    bg: '#ffffff',
    bgCard: '#ffffff',
    bgSurface: '#f0f0f0',
    border: 'rgba(0, 0, 0, 0.1)',
    text: '#1a1a1a',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    textMuted: 'rgba(0, 0, 0, 0.4)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

export function useThemeColors(scheme: 'light' | 'dark' = 'dark') {
  return scheme === 'light' ? colors.light : colors.dark;
}
