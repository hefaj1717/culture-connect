/** @type {import('tailwindcss').Config} */
const { themes } = require('./src/constants/theme-tokens.json');
const colors = themes.light;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        accentDeep: colors.accentDeep,
        secondary: colors.accent,
        ink: colors.ink,
        success: colors.success,
        destructive: colors.destructive,
        muted: colors.textSecondary,
        canvas: colors.background,
        progressTrack: colors.progressTrack,
        badgeQuest: colors.badgeQuest,
        badgeSocial: colors.badgeSocial,
        badgeExplore: colors.badgeExplore,
        badgeCulture: colors.badgeCulture,
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        serif: ['PlayfairDisplay_800ExtraBold'],
        heading: ['PlayfairDisplay_800ExtraBold'],
        display: ['PlayfairDisplay_900Black'],
        body: ['Inter_400Regular'],
        ui: ['Inter_600SemiBold'],
        caption: ['Inter_500Medium'],
        stat: ['PlayfairDisplay_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
