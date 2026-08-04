/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#241C2E',
    background: '#FAF8F5',
    backgroundElement: '#F1ECE6',
    backgroundSelected: '#E7DDF4',
    textSecondary: '#756F7B',
    primary: '#7C3AED',
    ink: '#241C2E',
    accent: '#F4A261',
    accentDeep: '#E76F51',
    badgeQuest: '#7C3AED',
    badgeSocial: '#F4A261',
    badgeExplore: '#14B8A6',
    badgeCulture: '#E76F51',
    progressTrack: '#D8CDD4',
    success: '#2F9E73',
  },
  dark: {
    text: '#ffffff',
    background: '#241C2E',
    backgroundElement: '#33283F',
    backgroundSelected: '#443354',
    textSecondary: '#D9D0E3',
    primary: '#A78BFA',
    ink: '#241C2E',
    accent: '#F4A261',
    accentDeep: '#E76F51',
    badgeQuest: '#A78BFA',
    badgeSocial: '#F4A261',
    badgeExplore: '#2DD4BF',
    badgeCulture: '#FB8B71',
    progressTrack: '#5B5066',
    success: '#4CC38D',
  },
} as const;

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

export const EngagementColors = {
  interested: '#D99B00',
  going: Colors.light.accent,
  attended: Colors.light.accentDeep,
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
