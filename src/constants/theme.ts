/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import themeTokens from './theme-tokens.json';

/** The single palette authority for React Native styles and Tailwind. */
export const Colors = themeTokens.themes;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter_400Regular',
    serif: 'Fraunces_700Bold',
    rounded: 'Inter_600SemiBold',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter_400Regular',
    serif: 'Fraunces_700Bold',
    rounded: 'Inter_600SemiBold',
    mono: 'monospace',
  },
  web: {
    sans: 'Inter, var(--font-display)',
    serif: 'Fraunces, var(--font-serif)',
    rounded: 'Inter, var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const FontTokens = {
  serifRegular: 'Fraunces_400Regular',
  heading: 'Fraunces_700Bold',
  display: 'Fraunces_900Black',
  body: 'Inter_400Regular',
  ui: 'Inter_600SemiBold',
  caption: 'Inter_500Medium',
  numeric: 'Fraunces_800ExtraBold',
} as const;

export const GamificationColors = {
  xp: Colors.light.success,
  xpDeep: Colors.light.success,
  progressTrack: Colors.light.progressTrack,
  badges: {
    quest: Colors.light.badgeQuest,
    social: Colors.light.badgeSocial,
    exploration: Colors.light.badgeExplore,
    culture: Colors.light.badgeCulture,
    reward: Colors.light.accent,
    status: Colors.light.success,
  },
} as const;

export const Typography = {
  screenTitle: {
    color: Colors.light.ink,
    fontFamily: FontTokens.heading,
    fontSize: 30,
    lineHeight: 35,
  },
  sectionTitle: {
    color: Colors.light.ink,
    fontFamily: FontTokens.heading,
    fontSize: 22,
    lineHeight: 28,
  },
  cardTitle: {
    color: Colors.light.ink,
    fontFamily: FontTokens.heading,
    fontSize: 20,
    lineHeight: 27,
  },
  body: {
    color: Colors.light.text,
    fontFamily: FontTokens.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bodyMuted: {
    color: Colors.light.textSecondary,
    fontFamily: FontTokens.body,
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    color: Colors.light.ink,
    fontFamily: FontTokens.ui,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    color: Colors.light.textSecondary,
    fontFamily: FontTokens.caption,
    fontSize: 12,
    lineHeight: 16,
  },
} as const satisfies Record<string, TextStyle>;

export const Radius = {
  small: 8,
  control: 12,
  card: 16,
  feature: 24,
  full: 9999,
} as const;

export const Shadows = {
  elevated: '0 12px 28px rgba(30, 30, 36, 0.09)',
  compact: '0 8px 18px rgba(30, 30, 36, 0.07)',
  soft: '0 6px 16px rgba(30, 30, 36, 0.05)',
} as const;

export const CardStyles = {
  elevated: {
    boxShadow: Shadows.elevated,
  },
  compact: {
    boxShadow: Shadows.compact,
  },
  soft: {
    boxShadow: Shadows.soft,
  },
} as const satisfies Record<string, ViewStyle>;

export const Spacing = {
  hairline: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 20,
  section: 24,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Motion = {
  fast: 150,
  standard: 250,
  slow: 400,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
