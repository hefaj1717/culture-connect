/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';
import themeTokens from './theme-tokens.json';

/** The single palette authority for React Native styles and Tailwind. */
export const Colors = themeTokens.themes;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter_400Regular',
    serif: 'PlayfairDisplay_800ExtraBold',
    rounded: 'Inter_600SemiBold',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter_400Regular',
    serif: 'PlayfairDisplay_800ExtraBold',
    rounded: 'Inter_600SemiBold',
    mono: 'monospace',
  },
  web: {
    sans: 'Inter, var(--font-display)',
    serif: 'Playfair Display, var(--font-serif)',
    rounded: 'Inter, var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const FontTokens = {
  heading: 'PlayfairDisplay_800ExtraBold',
  display: 'PlayfairDisplay_900Black',
  body: 'Inter_400Regular',
  ui: 'Inter_600SemiBold',
  caption: 'Inter_500Medium',
  numeric: 'PlayfairDisplay_800ExtraBold',
} as const;

export const GamificationColors = {
  xp: Colors.light.accent,
  xpDeep: Colors.light.accentDeep,
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

export const CardStyles = {
  elevated: {
    boxShadow: '0 12px 28px rgba(36, 28, 46, 0.09)',
  },
  compact: {
    boxShadow: '0 8px 18px rgba(36, 28, 46, 0.07)',
  },
  soft: {
    boxShadow: '0 6px 16px rgba(36, 28, 46, 0.05)',
  },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
