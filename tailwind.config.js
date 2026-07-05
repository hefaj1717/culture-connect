/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#24458F',
        secondary: '#F59E0B',
        success: '#22C55E',
        destructive: '#EF4444',
        muted: '#5F6675',
      },
    },
  },
  plugins: [],
};
