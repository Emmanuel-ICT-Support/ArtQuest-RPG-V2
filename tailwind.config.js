/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './MainGame.tsx',
    './components/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './constants.ts',
    './types.ts',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
