/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#F59E0B',
        success: '#22C55E',
        destructive: '#EF4444',
        muted: '#60646C',
      },
    },
  },
  plugins: [],
};
