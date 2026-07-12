/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        accent: '#F4A261',
        secondary: '#F4A261',
        ink: '#241C2E',
        success: '#2F9E73',
        destructive: '#EF4444',
        muted: '#756F7B',
        canvas: '#FAF8F5',
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
