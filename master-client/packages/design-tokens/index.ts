export const colors = {
  gold: '#d4af37',
  goldLight: '#ffc807',
  goldDark: '#d1a300',
  goldTransparent: 'rgba(212, 175, 55, 0.8)',

  // Dark theme
  dark: {
    bg: '#000000',
    bgElevated: '#0a0a0a',
    bgCard: '#111111',
    bgSurface: '#1a1a1a',
    bgMuted: '#262626',
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.15)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
  },

  // Light theme
  light: {
    bg: '#ffffff',
    bgElevated: '#f8f9fa',
    bgCard: '#ffffff',
    bgSurface: '#f0f0f0',
    bgMuted: '#e8e8e8',
    border: 'rgba(0, 0, 0, 0.1)',
    borderHover: 'rgba(0, 0, 0, 0.2)',
    text: '#1a1a1a',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    textMuted: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  fontFamily: {
    primary: 'Manrope, sans-serif',
    secondary: 'Poppins, sans-serif',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

export const breakpoints = {
  phone: 400,
  tablet: 768,
  tabletLandscape: 992,
  laptop: 1200,
  desktop: 1500,
  desktopLarge: 1920,
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
