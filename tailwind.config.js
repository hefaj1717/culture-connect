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
        ink: colors.ink,
        success: colors.success,
        destructive: colors.destructive,
        muted: colors.textSecondary,
        canvas: colors.background,
        surface: colors.surface,
        subtle: colors.backgroundElement,
        line: colors.borderSubtle,
        progressTrack: colors.progressTrack,
        badgeQuest: colors.badgeQuest,
        badgeSocial: colors.badgeSocial,
        badgeExplore: colors.badgeExplore,
        badgeCulture: colors.badgeCulture,
        accentSoft: colors.accentSoft,
        successSoft: colors.successSoft,
        primarySoft: colors.primarySoft,
        highlight: colors.highlight,
        highlightSoft: colors.highlightSoft,
        highlightDeep: colors.highlightDeep,
        canvasWarm: colors.canvasWarm,
      },
      // One type scale for the whole app. Use these instead of arbitrary text-[Npx] sizes.
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        footnote: ['13px', { lineHeight: '18px' }],
        body: ['15px', { lineHeight: '21px' }],
        headline: ['17px', { lineHeight: '22px' }],
        title3: ['20px', { lineHeight: '25px' }],
        title2: ['24px', { lineHeight: '29px' }],
        title1: ['30px', { lineHeight: '35px' }],
        largeTitle: ['36px', { lineHeight: '41px' }],
        hero: ['48px', { lineHeight: '52px' }],
      },
      // Each weight is its own loaded font file. Never combine these with font-bold etc.:
      // a fontWeight on a custom family falls back to the system font on Android.
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        sans: ['Inter_400Regular'],
        serif: ['PlayfairDisplay_800ExtraBold'],
        serifRegular: ['PlayfairDisplay_400Regular'],
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
